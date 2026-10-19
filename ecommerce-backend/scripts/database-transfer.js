const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const { Client } = require("pg");
const root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env"), quiet: true });
const dataRoot = path.join(root, "data");
const quote = name => `"${name.replace(/"/g, '""')}"`;
const config = database => ({ host: process.env.DB_HOST || "localhost", port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USER || "postgres", password: process.env.DB_PASSWORD || "root", database: database || process.env.DATABASE_NAME, connectionTimeoutMillis: 10000 });
const digest = async file => crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
const inside = (parent, candidate) => { const relative = path.relative(parent, candidate); return relative && !relative.startsWith("..") && !path.isAbsolute(relative); };
async function binary(name) {
  const executable = process.platform === "win32" ? `${name}.exe` : name;
  const candidates = [process.env.PG_BIN && path.join(process.env.PG_BIN, executable), executable].filter(Boolean);
  if (process.platform === "win32") {
    const directory = path.join(process.env.ProgramFiles || "C:/Program Files", "PostgreSQL");
    const versions = await fs.readdir(directory).catch(() => []);
    for (const version of versions.sort((a, b) => Number(b) - Number(a))) candidates.push(path.join(directory, version, "bin", executable));
  }
  for (const candidate of candidates) if (spawnSync(candidate, ["--version"], { windowsHide: true, encoding: "utf8" }).status === 0) return candidate;
  throw new Error(`Install PostgreSQL client tools (same major version as the source server or newer), or set PG_BIN to their bin directory. Missing: ${name}.`);
}
async function run(name, args) {
  const command = await binary(name); const settings = config();
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, windowsHide: true, env: { ...process.env, PGHOST: settings.host, PGPORT: String(settings.port), PGUSER: settings.user, PGPASSWORD: settings.password, PGDATABASE: settings.database }, stdio: ["ignore", "ignore", "pipe"] });
    let errors = ""; child.stderr.on("data", chunk => { errors = (errors + chunk.toString()).slice(-4000); });
    child.on("error", reject); child.on("close", code => code === 0 ? resolve() : reject(new Error(`${name} failed. ${errors.split(settings.password).join("[redacted]")}`)));
  });
}
async function files(directory, prefix = "") {
  const result = [];
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, item.name); const absolute = path.join(directory, item.name);
    if (item.isSymbolicLink()) throw new Error("Snapshot media cannot contain symbolic links.");
    if (item.isDirectory()) for (const entry of await files(absolute, relative)) result.push(entry);
    else if (item.isFile()) result.push({ path: relative.split(path.sep).join("/"), bytes: (await fs.stat(absolute)).size, sha256: await digest(absolute) });
  }
  return result;
}
async function counts(client) {
  const { rows } = await client.query("SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY schemaname, tablename");
  const result = [];
  for (const row of rows) result.push({ schema: row.schemaname, table: row.tablename, rows: Number((await client.query(`SELECT count(*) AS count FROM ${quote(row.schemaname)}.${quote(row.tablename)}`)).rows[0].count) });
  return result;
}
async function exportData() {
  if (!process.env.DATABASE_NAME) throw new Error("Set DATABASE_NAME in ecommerce-backend/.env.");
  await binary("pg_dump");
  const id = new Date().toISOString().replace(/[:.]/g, "-");
  const directory = path.join(dataRoot, "snapshots", id);
  await fs.mkdir(directory, { recursive: true });
  const client = new Client(config()); await client.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const snapshot = (await client.query("SELECT pg_export_snapshot() AS id")).rows[0].id;
    const version = (await client.query("SHOW server_version_num")).rows[0].server_version_num;
    const tables = await counts(client);
    const archive = path.join(directory, "database.dump");
    await run("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--no-password", `--snapshot=${snapshot}`, `--file=${archive}`]);
    await client.query("COMMIT");
    const media = [];
    for (const [name, source] of [["uploads", path.join(root, "uploads")], ["frontend-images", path.resolve(root, "../ecommerce-frontend/public/images")]]) {
      if (!await fs.stat(source).then(stat => stat.isDirectory()).catch(() => false)) continue;
      const destination = path.join(directory, name);
      await fs.cp(source, destination, { recursive: true, errorOnExist: true, force: false });
      media.push({ name, files: await files(destination) });
    }
    const manifest = { format: 1, createdAt: new Date().toISOString(), postgresVersion: version, archiveSha256: await digest(archive), tables, media };
    await fs.writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2));
    await fs.writeFile(path.join(dataRoot, "latest.json"), JSON.stringify({ snapshot: `snapshots/${id}` }, null, 2));
    console.log(`Snapshot ready: data/snapshots/${id}`);
    console.log(`${tables.length} tables, ${tables.reduce((sum, table) => sum + table.rows, 0)} rows, ${media.reduce((sum, group) => sum + group.files.length, 0)} media files. No environment credentials included.`);
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { await client.end(); }
}
async function loadSnapshot() {
  let latest;
  try { latest = JSON.parse(await fs.readFile(path.join(dataRoot, "latest.json"), "utf8")); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    const snapshots = path.join(dataRoot, "snapshots");
    const entries = await fs.readdir(snapshots, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.filter(entry => entry.isDirectory() && !entry.isSymbolicLink()).sort((a, b) => b.name.localeCompare(a.name))) {
      const candidate = path.join(snapshots, entry.name);
      if (await fs.stat(path.join(candidate, "manifest.json")).then(stat => stat.isFile()).catch(() => false) && await fs.stat(path.join(candidate, "database.dump")).then(stat => stat.isFile()).catch(() => false)) {
        latest = { snapshot: `snapshots/${entry.name}` };
        console.log(`latest.json is missing; using snapshot ${entry.name}.`);
        break;
      }
    }
    if (!latest) throw new Error("No complete snapshot found. Copy data/snapshots/<snapshot-folder>/ including manifest.json, database.dump and its media folders from the source machine.");
  }
  const directory = path.resolve(dataRoot, latest.snapshot);
  if (!inside(dataRoot, directory)) throw new Error("Invalid snapshot directory.");
  const manifest = JSON.parse(await fs.readFile(path.join(directory, "manifest.json"), "utf8"));
  if (manifest.format !== 1 || !Array.isArray(manifest.tables) || !Array.isArray(manifest.media)) throw new Error("Unsupported snapshot format.");
  const archive = path.join(directory, "database.dump");
  if (await digest(archive) !== manifest.archiveSha256) throw new Error("Database snapshot checksum failed. Copy the snapshot again.");
  for (const group of manifest.media) {
    if (!["uploads", "frontend-images"].includes(group.name)) throw new Error("Invalid media group.");
    for (const entry of group.files) {
      const file = path.resolve(directory, group.name, entry.path);
      if (!inside(path.join(directory, group.name), file) || await digest(file) !== entry.sha256) throw new Error(`Media checksum failed: ${group.name}/${entry.path}`);
    }
  }
  return { directory, archive, manifest };
}
async function importData() {
  const { directory, archive, manifest } = await loadSnapshot();
  if (process.argv.includes("--verify")) { console.log(`Snapshot checksums verified: ${manifest.tables.length} tables and ${manifest.media.reduce((sum, group) => sum + group.files.length, 0)} media files.`); return; }
  if (!process.env.DATABASE_NAME) throw new Error("Set DATABASE_NAME in ecommerce-backend/.env to the NEW target database.");
  await binary("pg_restore");
  let client = new Client(config());
  try { await client.connect(); }
  catch (error) {
    await client.end().catch(() => {});
    if (error.code !== "3D000") throw error;
    const admin = new Client(config(process.env.DB_ADMIN_DATABASE || "postgres"));
    await admin.connect();
    try { await admin.query(`CREATE DATABASE ${quote(process.env.DATABASE_NAME)} TEMPLATE template0`); } finally { await admin.end(); }
    client = new Client(config()); await client.connect();
  }
  try {
    const existing = await client.query("SELECT count(*) AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' AND c.relkind IN ('r','v','m','S','f')");
    const types = await client.query("SELECT count(*) AS count FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' AND t.typtype IN ('e','d','c','r','m')");
    if (Number(existing.rows[0].count) || Number(types.rows[0].count)) throw new Error("Target database is not empty (tables or custom types exist). Existing data was preserved. Stop the backend and its workers, then set DATABASE_NAME in .env to a NEW unused database name. The restore will create it from template0; keep the backend stopped until restoration finishes.");
    // Preserve conflicting media before installing the verified snapshot versions.
    const mediaBackup = path.join(root, ".seed-backups", `restore-${Date.now()}-${require("node:crypto").randomUUID()}`);
    let backedUp = 0;
    for (const group of manifest.media) {
      const destination = group.name === "uploads" ? path.join(root, "uploads") : path.resolve(root, "../ecommerce-frontend/public/images");
      for (const entry of group.files) {
        const target = path.resolve(destination, entry.path);
        if (!inside(destination, target)) throw new Error("Invalid media destination.");
        const exists = await fs.stat(target).then(() => true).catch(() => false);
        if (exists && await digest(target) !== entry.sha256) {
          const backup = path.resolve(mediaBackup, group.name, entry.path);
          if (!inside(mediaBackup, backup)) throw new Error("Invalid media backup destination.");
          await fs.mkdir(path.dirname(backup), { recursive: true });
          await fs.copyFile(target, backup, require("node:fs").constants.COPYFILE_EXCL);
          if (backedUp++ === 0) console.log(`Existing media backups: ${mediaBackup}`);
          await fs.copyFile(path.join(directory, group.name, entry.path), target);
        }
        if (!exists) { await fs.mkdir(path.dirname(target), { recursive: true }); await fs.copyFile(path.join(directory, group.name, entry.path), target, require("node:fs").constants.COPYFILE_EXCL); }
      }
    }
    if (backedUp) console.log(`Preserved ${backedUp} conflicting media files and installed snapshot versions.`);
    const version = Number((await client.query("SHOW server_version_num")).rows[0].server_version_num);
    if (version < 170000) {
      // Newer pg_restore emits this session setting even for otherwise compatible schemas.
      // Keep all schema/data SQL intact, and let psql abort/roll back on any other incompatibility.
      await binary("psql");
      const temporary = await fs.mkdtemp(path.join(require("node:os").tmpdir(), "mxsocal-restore-"));
      const sqlFile = path.join(temporary, "restore.sql");
      try {
        await run("pg_restore", ["--no-owner", "--no-acl", `--file=${sqlFile}`, archive]);
        const sql = await fs.readFile(sqlFile, "utf8");
        await fs.writeFile(sqlFile, sql.replace(/^SET transaction_timeout = 0;\r?\n/gm, ""), { mode: 0o600 });
        await fs.chmod(sqlFile, 0o600);
        console.log("Older PostgreSQL server detected; omitting unsupported transaction_timeout setting.");
        await run("psql", ["--no-psqlrc", "--no-password", "--set=ON_ERROR_STOP=1", "--single-transaction", `--dbname=${process.env.DATABASE_NAME}`, `--file=${sqlFile}`]);
      } finally {
        await fs.unlink(sqlFile).catch(() => {});
        await fs.rmdir(temporary).catch(() => {});
      }
    } else {
      await run("pg_restore", ["--no-owner", "--no-acl", "--no-password", "--exit-on-error", "--single-transaction", `--dbname=${process.env.DATABASE_NAME}`, archive]);
    }
    const actual = await counts(client);
    if (JSON.stringify(actual) !== JSON.stringify(manifest.tables)) throw new Error("Database restored, but row verification differs. Keep the app stopped and inspect the target database.");
    console.log(`Restore complete and verified: ${actual.length} tables, ${actual.reduce((sum, table) => sum + table.rows, 0)} rows. Uploaded media and frontend images restored.`);
    console.log("Start the app only after configuring its environment for the new host.");
  } finally { await client.end(); }
}
(process.argv.includes("--export") ? exportData() : importData()).catch(error => { console.error(`Data transfer failed: ${error.message}`); process.exitCode = 1; });
