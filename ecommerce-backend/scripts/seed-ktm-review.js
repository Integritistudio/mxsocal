const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const sequelize = require("../config/database");
sequelize.options.logging = false;
const { Product } = require("../models/product.model");
const Review = require("../models/product-review.model");
(async () => {
  const product = await Product.findOne({ where: { slug: "ktm-300-exc", category: "bike" } });
  if (!product) throw new Error("KTM 300 EXC was not found. Run seed:bikes and seed:product-details first.");
  const [, created] = await Review.findOrCreate({
    where: { productId: product.id, authorName: "Casey Morgan", title: "Confident handling on the trails" },
    defaults: {
      email: "demo-ktm-extra@example.com", status: "approved", rating: 5,
      comment: "The KTM felt responsive and easy to control on our trail ride. Pickup was straightforward, and the team helped us get comfortable with the setup before heading out. A great day of riding.",
      ratings: { performance: 5, handling: 5, comfort: 5, condition: 5, rental: 5, value: 5 },
      images: ["/images/product-detail/05378.png"],
      // Keep this extra demo review behind the original two in the default newest-first order.
      createdAt: new Date("2025-01-01T12:00:00Z"),
    },
  });
  const approved = await Review.count({ where: { productId: product.id, status: "approved" } });
  console.log(`${created ? "Added one approved demo review." : "Extra demo review already exists."} KTM 300 EXC now has ${approved} approved reviews.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
