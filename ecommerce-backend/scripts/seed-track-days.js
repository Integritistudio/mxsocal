const path = require("node:path");
const fs = require("node:fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const db = require("../config/database");
db.options.logging = false;
const Track = require("../models/track.model");
const Availability = require("../models/track-availability.model");
const { availabilityMonths } = require("../lib/track-availability");
(async () => {
  const months = availabilityMonths();
  await db.transaction(async transaction => {
    const tracks = await Track.findAll({ transaction });
    const old = await Availability.findAll({ where: { trackId: tracks.map(track => track.id), month: months }, transaction });
    const backup = `track-days-backup-${Date.now()}.json`;
    fs.writeFileSync(path.resolve(__dirname, "../data", backup), JSON.stringify(old.map(row => row.toJSON()), null, 2), { flag: "wx" });
    for (const track of tracks) for (const month of months) {
      const [year, number] = month.split("-").map(Number);
      const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
      const days = Object.fromEntries(Array.from({ length: count }, (_, index) => [`${month}-${String(index + 1).padStart(2, "0")}`, { status: "available", note: "" }]));
      await Availability.upsert({ trackId: track.id, month, days }, { transaction, conflictFields: ["trackId", "month"] });
    }
    console.log(`All days available for ${tracks.length} tracks in ${months.join(" and ")}. Backup: ${backup}`);
  });
})().catch(error => { console.error("Track availability update failed:", error.name); process.exitCode = 1; }).finally(() => db.close());
