const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const sequelize = require('../config/database');
sequelize.options.logging = false;
const { Product } = require('../models/product.model');
const Review = require('../models/product-review.model');
const samples = [
  { authorName: 'Demo Rider Alex', title: '[Demo] A fun track-day choice', score: 5, body: 'Sample review for demonstration only. The {bike} would be a great pick for a full day of riding, with a setup that feels ready for the track.' },
  { authorName: 'Demo Rider Jordan', title: '[Demo] Great for a riding weekend', score: 4, body: 'Sample review for demonstration only. The {bike} is the kind of bike I would choose for a weekend with friends. A clear handover and setup advice would complete the experience.' },
  { authorName: 'Demo Rider Casey', title: '[Demo] Ready for the next ride', score: 5, body: 'Sample review for demonstration only. The {bike} looks like an exciting option for exploring California tracks and working on riding technique.' },
];
(async () => {
  let added = 0;
  await sequelize.transaction(async transaction => {
    const bikes = await Product.findAll({ where: { category: 'bike' }, order: [['name', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
    for (const bike of bikes) {
      for (const [index, sample] of samples.entries()) {
        const [, created] = await Review.findOrCreate({ where: { productId: bike.id, authorName: sample.authorName, title: sample.title }, defaults: {
          productId: bike.id, authorName: sample.authorName, title: sample.title,
          email: `demo-bike-review-${index + 1}@example.com`, comment: sample.body.replace('{bike}', bike.name),
          rating: sample.score, ratings: Object.fromEntries(['performance', 'handling', 'comfort', 'condition', 'rental', 'value'].map(key => [key, sample.score])),
          status: 'approved', images: [], userId: null,
        }, transaction });
        if (created) added++;
      }
      const count = await Review.count({ where: { productId: bike.id, authorName: samples.map(sample => sample.authorName), title: samples.map(sample => sample.title), status: 'approved' }, transaction });
      if (count !== 3) throw new Error(`Demo review verification failed for ${bike.name}`);
      console.log(`${bike.name}: ${count} labeled demo reviews`);
    }
  });
  console.log(`Added ${added} demo reviews. Existing reviews preserved.`);
})().catch(error => { console.error('Demo review seed failed:', error.name); process.exitCode = 1; }).finally(() => sequelize.close());
