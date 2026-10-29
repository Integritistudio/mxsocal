const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const sequelize = require("../config/database");
sequelize.options.logging = false;
const { Product, BikeSpec } = require("../models/product.model");
const listings = [
  { name: "Honda CRF250R", brand: "Honda", image: "1cc67.png", price: 120, size: "250cc", tagline: "Lightweight, Race-Ready", features: ["Low Hours", "Beginner", "Track Ready"], modelYear: 2024 },
  { name: "Yamaha YZ450F", brand: "Yamaha", image: "cd178.png", price: 150, size: "450cc", tagline: "High-Power MX Bike", features: ["Lightly Ridden", "Pro Suspension", "Popular Choice"], modelYear: 2024 },
  { name: "KTM 300 EXC", brand: "KTM", image: "bb11e.png", price: 140, size: "300cc", tagline: "Enduro Adventure Ready", features: ["Low Hours", "Easy Handling", "Off-Road Ready"], modelYear: 2024 },
  { name: "Husqvarna FC250", brand: "Husqvarna", image: "da83f.png", price: 130, size: "250cc", tagline: "Pro Racing Suspension", features: ["Low Hours", "Beginner", "Track Ready"], modelYear: 2024 },
  { name: "Honda CRF250R — 2025", brand: "Honda", image: "1cc67.png", price: 135, size: "250cc", tagline: "Ready For Your Next Track Day", features: ["Low Hours", "Easy Handling", "Track Ready"], modelYear: 2025 },
  { name: "Yamaha YZ450F — 2025", brand: "Yamaha", image: "cd178.png", price: 165, size: "450cc", tagline: "Power For Experienced Riders", features: ["Low Hours", "Pro Suspension", "Track Ready"], modelYear: 2025 },
];
(async () => {
  await sequelize.authenticate();
  const start = Date.now();
  let added = 0;
  await sequelize.transaction(async transaction => {
    await sequelize.query('LOCK TABLE "Products" IN EXCLUSIVE MODE', { transaction });
    for (const [index, item] of listings.entries()) {
      const slug = `mxsocal-${item.brand.toLowerCase()}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`;
      const [bike, created] = await Product.findOrCreate({ where: { name: item.name, category: "bike" }, defaults: {
        name: item.name, brand: item.brand, description: `${item.tagline}. Rent the ${item.name} for your next Southern California riding adventure. Contact our team for availability and help choosing your setup.`, images: [`/images/bikes/${item.image}`], pricePerDay: item.price, currency: "USD", available: true, status: "available", attributes: { tagline: item.tagline, features: item.features }, createdAt: new Date(start + index),
      }, transaction });
      if (created) {
        await BikeSpec.create({ productId: bike.id, model: item.name.split(" — ")[0], modelYear: item.modelYear, engineCapacity: item.size, transmission: "Manual", fuelType: "Gasoline" }, { transaction });
        added++;
      }
    }
  });
  console.log(`Added ${added} demo bike listings. Existing products preserved. Total bikes: ${await Product.count({ where: { category: "bike" } })}`);
})().catch(error => { console.error(`Bike seed failed (${error.name}). No bike additions committed.`); process.exitCode = 1; }).finally(() => sequelize.close());
