const path = require("node:path");
const fs = require("node:fs/promises");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const sequelize = require("../config/database");
sequelize.options.logging = false;
const Coach = require("../models/coach.model");

const coaches = [
  { firstName: "Jake", lastName: "Thompson", specialty: "Motocross Racing Techniques", experience: 10, experienceLabel: "10+ years riding and coaching", skills: ["Jump control & landing techniques", "Race track cornering", "Speed and throttle control"], coachingLevels: ["Beginner", "Intermediate"], hourlyRate: 150, profileImage: "/images/coaches/26a63.png", imagePresentation: { height: 149.73, top: -9.48 } },
  { firstName: "Marcus", lastName: "Rivera", specialty: "Off-Road Trail Riding", experience: 8, experienceLabel: "8 years professional trail riding", skills: ["Hill climbing techniques", "Rocky terrain riding", "Balance and endurance training"], coachingLevels: ["Beginner", "Intermediate"], hourlyRate: 125, profileImage: "/images/coaches/409c3.png", imagePresentation: { height: 199.63, top: 0.02 } },
  { firstName: "Liam", lastName: "Carter", specialty: "Freestyle Dirt Bike Tricks", experience: 12, experienceLabel: "12 years freestyle motocross", skills: ["Basic freestyle tricks", "Jump confidence training", "Body positioning in air"], coachingLevels: ["Intermediate", "Advanced"], hourlyRate: 200, profileImage: "/images/coaches/59aa8.png", imagePresentation: { height: 149.73, top: -0.09 } },
  { firstName: "Ethan", lastName: "Walker", specialty: "Beginner Dirt Bike Training", experience: 7, experienceLabel: "7 years coaching beginners", skills: ["Basic bike control", "Safety training", "Proper braking & turning"], coachingLevels: ["Beginner"], hourlyRate: 100, profileImage: "/images/coaches/4c68f.png", imagePresentation: { height: 135.18, top: -0.04 } },
].map((coach, index) => ({ ...coach, email: `${coach.firstName.toLowerCase()}.${coach.lastName.toLowerCase()}@example.com`, country: "United States", state: "California", bio: `${coach.specialty} coaching for ${coach.coachingLevels.join(" and ").toLowerCase()} riders.`, displayOrder: index }));

async function seed() {
  await sequelize.authenticate();
  // Add only missing coach columns. Never sync/alter unrelated application tables.
  const query = sequelize.getQueryInterface();
  const tables = await query.showAllTables();
  if (!tables.includes(Coach.getTableName())) await Coach.sync();
  else {
    const columns = await query.describeTable(Coach.getTableName());
    for (const name of ["specialty", "experienceLabel", "skills", "coachingLevels", "hourlyRate", "displayOrder", "imagePresentation"]) {
      if (!columns[name]) await query.addColumn(Coach.getTableName(), name, Coach.rawAttributes[name]);
    }
  }
  await sequelize.transaction(async transaction => {
    await sequelize.query('LOCK TABLE "Coaches" IN EXCLUSIVE MODE', { transaction });
    const existing = await Coach.findAll({ transaction });
    if (existing.length) {
      const directory = path.resolve(__dirname, "../.seed-backups");
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, `coaches-${Date.now()}.json`), JSON.stringify(existing, null, 2), { flag: "wx" });
    }
    await Coach.destroy({ where: {}, transaction });
    await Coach.bulkCreate(coaches, { transaction, validate: true });
    console.log(`Replaced ${existing.length} coach records with ${coaches.length} design coaches. Existing records backed up locally when present.`);
  });
}
seed().catch(error => { console.error(`Coach seed failed (${error.name}). No coach replacement committed.`); process.exitCode = 1; }).finally(() => sequelize.close());
