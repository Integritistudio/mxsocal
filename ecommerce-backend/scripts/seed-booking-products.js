const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const sequelize = require("../config/database");
sequelize.options.logging = false;
const { Product, HelmetSpec, SuitSpec } = require("../models/product.model");
const Coach = require("../models/coach.model");
const groups = [
  { name: "Raptor X Pro Helmet", category: "helmet", group: "helmet", files: ["2600c", "7565c", "0a4a3", "807d3", "75b98", "5f483"] },
  { name: "TrailBlazer MX Suit", category: "suit", group: "suit", files: ["ec73b", "30d9f", "2108f", "0eb88", "db058", "3f979"] },
  { name: "DirtMaster Pro Boots", category: "accessory", group: "boots", files: ["3be6c", "d417b", "aeffc", "ad25f", "1627a", "02cf9"] },
];
(async () => {
  let added = 0;
  await sequelize.transaction(async transaction => {
    await sequelize.query('LOCK TABLE "Products", "ProductAvailabilities", "Coaches" IN EXCLUSIVE MODE', { transaction });
    for (const group of groups) for (const [index, file] of group.files.entries()) {
      const slug = `booking-${group.group}-${index + 1}`;
      const [product, created] = await Product.findOrCreate({ where: { slug }, defaults: { name: group.name, category: group.category, images: [`/images/booking/${file}.png`], pricePerDay: 5, currency: "USD", available: true, status: "available", attributes: { rentalGroup: group.group, sizes: ["S", "M", "L"], variant: index + 1, designAsset: file } }, transaction });
      if (created) {
        added++;
        const Model = { helmet: HelmetSpec, suit: SuitSpec }[group.category];
        if (Model) await Model.create({ productId: product.id, sizes: ["S", "M", "L"] }, { transaction });
      }
    }
    await Coach.findOrCreate({ where: { email: "alex.rider@example.com" }, defaults: { firstName: "Alex", lastName: "Rider", specialty: "Beginner & Safety Coach", bio: "Alex specializes in helping first-time and beginner riders build confidence on dirt bikes. His calm teaching style and focus on safety make learning fun and stress-free.", hourlyRate: 5, profileImage: "/images/booking/26a63.png", displayOrder: -1, coachingLevels: ["Beginner"], skills: ["Safety training", "Basic bike control"], country: "United States", state: "California" }, transaction });
    // Availability defaults to 24/7; administrators manage exceptions.

  });
  console.log(`Added ${added} gear products and ensured Alex Rider exists. Resources default to 24/7; administrator schedules are preserved.`);
})().catch(error => { console.error(`Booking seed failed (${error.name}).`); process.exitCode = 1; }).finally(() => sequelize.close());
