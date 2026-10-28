const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const sequelize = require('../config/database');
sequelize.options.logging = false;
const { Product, BikeSpec } = require('../models/product.model');
const sources = require('../data/bike-photo-sources.json');
const publicRoot = path.resolve(__dirname, '../../ecommerce-frontend/public');
const unique = values => [...new Set(values.filter(value => typeof value === 'string' && value))];
(async () => {
  const apply = process.argv.includes('--apply');
  await sequelize.transaction(async transaction => {
    const bikes = await Product.findAll({ where: { category: 'bike' }, include: [{ model: BikeSpec, as: 'bikeSpec' }], transaction });
    const changes = bikes.map(bike => {
      const source = sources.find(item => bike.name.startsWith(item.name) && bike.bikeSpec?.modelYear === item.year);
      const downloaded = source?.photos.map(photo => photo.path) || [];
      const gallery = unique([...(bike.attributes?.details?.gallery || []), ...(bike.images || []), ...downloaded]);
      if (gallery.length < 5) throw new Error(`Not enough photos for ${bike.name}`);
      for (const file of gallery) {
        if (!file.startsWith('/images/')) throw new Error(`Unexpected image location for ${bike.name}`);
        const resolved = path.resolve(publicRoot, file.slice(1));
        if (!resolved.startsWith(publicRoot + path.sep) || !fs.existsSync(resolved) || fs.statSync(resolved).size < 100) throw new Error(`Missing image: ${file}`);
      }
      return { bike, gallery };
    });
    if (apply) {
      const backup = path.resolve(__dirname, `../data/bike-gallery-backup-${Date.now()}.json`);
      fs.writeFileSync(backup, JSON.stringify(changes.map(({ bike }) => ({ id: bike.id, images: bike.images, attributes: bike.attributes })), null, 2), { flag: 'wx' });
      for (const { bike, gallery } of changes) {
        await bike.update({ images: unique([...(bike.images || []), ...gallery]), attributes: { ...bike.attributes, details: { ...bike.attributes?.details, gallery } } }, { transaction });
      }
      console.log(`Saved rollback backup: ${path.basename(backup)}`);
    }
    for (const { bike, gallery } of changes) console.log(`${apply ? 'Updated' : 'Verified'} ${bike.name}: ${gallery.length} photos`);
  });
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
