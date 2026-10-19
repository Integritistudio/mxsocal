const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const sequelize = require("../config/database");
sequelize.options.logging = false;
const Coach = require("../models/coach.model");

const extras = [
  {
    firstName: "Owen", lastName: "Reed", email: "owen.reed@example.com",
    specialty: "Off-Road Trail Riding", experience: 9,
    experienceLabel: "9 years exploring and coaching off-road trails",
    skills: ["Trail navigation", "Technical terrain handling", "Climbing and descending control"],
    coachingLevels: ["Beginner", "Intermediate"], hourlyRate: 140,
    profileImage: "/images/coaches/57033.png",
    bio: "Build confidence on trails with practical off-road coaching.",
  },
  {
    firstName: "Noah", lastName: "Brooks", email: "noah.brooks@example.com",
    specialty: "Motocross Racing Techniques", experience: 11,
    experienceLabel: "11 years racing and developing motocross riders",
    skills: ["Race starts and line selection", "Cornering and braking drills", "Jump progression"],
    coachingLevels: ["Intermediate", "Advanced"], hourlyRate: 175,
    profileImage: "/images/coaches/bb11e.png",
    bio: "Improve race technique with structured track coaching.",
  },
];

(async () => {
  await sequelize.authenticate();
  await sequelize.transaction(async transaction => {
    await sequelize.query('LOCK TABLE "Coaches" IN EXCLUSIVE MODE', { transaction });
    let order = Number(await Coach.max("displayOrder", { transaction })) || 0;
    let added = 0;
    for (const coach of extras) {
      const [, created] = await Coach.findOrCreate({
        where: { email: coach.email },
        defaults: { ...coach, country: "United States", state: "California", displayOrder: ++order },
        transaction,
      });
      if (created) added++;
    }
    console.log(`Added ${added} extra coaches. Existing coach records preserved.`);
  });
  console.log(`Total coaches: ${await Coach.count()}`);
})().catch(error => { console.error(`Extra coach seed failed (${error.name}).`); process.exitCode = 1; }).finally(() => sequelize.close());
