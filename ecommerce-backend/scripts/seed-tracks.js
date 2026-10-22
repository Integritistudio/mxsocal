const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const sequelize = require("../config/database");
sequelize.options.logging = false;
const Track = require("../models/track.model");
const tracks = require("../data/tracks");
async function seed() {
  await sequelize.authenticate();
  // Create only the new Tracks table. Preserve existing track edits on reruns.
  await Track.sync();
  await require("../models/track-availability.model").sync();
  await sequelize.transaction(async transaction => {
    for (const track of tracks) {
      const [record] = await Track.findOrCreate({ where: { slug: track.slug }, defaults: track, transaction });
      const images = [...new Set([...(record.images || []), ...track.images])];
      if (images.length !== record.images.length) await record.update({ images }, { transaction });
    }
  });
  console.log(`Tracks ready: ${await Track.count()} records.`);
}
seed().catch(error => { console.error(`Track seed failed (${error.name}).`); process.exitCode = 1; }).finally(() => sequelize.close());
