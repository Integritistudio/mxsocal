const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const sequelize = require("../config/database");
sequelize.options.logging = false;
const { Product, BikeSpec } = require("../models/product.model");
const Review = require("../models/product-review.model");
const slugify = require("../helpers/product-slug");
const pairs = values => Object.entries(values).map(([label, value]) => ({ label, value: String(value) }));
const ratings = score => Object.fromEntries(["performance", "handling", "comfort", "condition", "rental", "value"].map(key => [key, score]));
(async () => {
  await sequelize.authenticate();
  await Review.sync();
  await require("../models/review-image.model").sync();
  let updated = 0, reviewsAdded = 0;
  await sequelize.transaction(async transaction => {
    const products = await Product.findAll({ include: [{ model: BikeSpec, as: "bikeSpec" }], transaction });
    const usedSlugs = new Set(products.filter(p => p.slug && !p.slug.startsWith("mxsocal-")).map(p => p.slug));
    for (const p of products) {
      if (!p.slug || p.slug.startsWith("mxsocal-")) {
        const baseSlug = slugify(p.name) || "product";
        let nextSlug = baseSlug, suffix = 2;
        while (usedSlugs.has(nextSlug)) nextSlug = `${baseSlug}-${suffix++}`;
        usedSlugs.add(nextSlug);
        await p.update({ slug: nextSlug }, { transaction });
      }
      const ktm = p.brand === "KTM" && p.category === "bike";
      const spec = p.bikeSpec;
      if (!p.attributes?.details) {
        const overview = p.category === "bike" ? pairs({ "Bike Type": ktm ? "Enduro / Off-Road Dirt Bike" : "Motocross / Off-Road Dirt Bike", "Model Year": spec?.modelYear || "2024", Engine: ktm ? "293cc, 2-Stroke, Single-Cylinder" : spec?.engineCapacity || "Contact our team", Transmission: ktm ? "6-Speed Manual" : spec?.transmission || "Manual", Color: ktm ? "KTM Orange / White" : `${p.brand || "Factory"} colors`, Condition: "Low Hours · Excellent", "Rider Level": ktm ? "Intermediate to Advanced" : "Ask our team for rider suitability", Suspension: ktm ? "WP XPLOR Front & Rear" : "Factory suspension", "Seat Height": ktm ? "37.8 in (960 mm)" : "Confirm when booking", Weight: ktm ? "243 lbs (110 kg)" : "Confirm when booking", "Fuel Tank Capacity": ktm ? "2.3 gal (8.7 L)" : "Confirm when booking", "Range (Approx.)": ktm ? "35–45 miles per tank" : "Varies by riding conditions" }) : pairs({ Brand: p.brand || "MXSoCal", Category: p.category, Condition: "Inspected before every rental", Location: p.location || "Southern California" });
        const details = {
          ...(ktm ? { gallery: ["7a4a5.png", "9e6e4.png", "63b2d.png", "c125c.png", "05378.png"].map(file => `/images/product-detail/${file}`) } : {}),
          subtitle: p.category === "bike" ? "Off-Road Dirt Bike" : `${p.brand || "MXSoCal"} Riding Equipment`,
          badges: p.category === "bike" ? [String(spec?.modelYear || 2024), ktm ? "35–45 miles" : spec?.engineCapacity || "Off-Road", ktm ? "6-Speed Manual" : "Manual", "Petrol"] : [p.category, "Rental Ready"], overview,
          specifications: p.category === "bike" ? [
            { title: "Engine and Transmission", rows: ktm ? pairs({ "Engine Type": "293cc, 2-Stroke, Single-Cylinder", "Cooling System": "Liquid-Cooled", "Fuel System": "Electronic Fuel Injection (EFI)", "Power Delivery": "Strong low-end torque", Clutch: "Hydraulic Wet Clutch", Frame: "Lightweight Chromoly Steel", "Front Suspension": "WP XPLOR USD Forks", "Rear Suspension": "WP XPLOR PDS Shock" }) : pairs({ Engine: spec?.engineCapacity || "Contact our team", Transmission: spec?.transmission || "Manual", Fuel: spec?.fuelType || "Gasoline", "Model Year": spec?.modelYear || 2024 }) },
            { title: "Dimensions & Weight", rows: overview.filter(row => ["Seat Height", "Weight", "Fuel Tank Capacity"].includes(row.label)) },
            { title: "Intended Use", rows: pairs({ Terrain: "Off-road trails and designated riding areas", Safety: "Helmet and protective riding equipment required", Support: "Our team will help match the bike to your experience" }) },
          ] : [{ title: "Product Details", rows: overview }],
          address: p.location || "Southern California",
          mapEmbedUrl: `https://www.google.com/maps?q=${encodeURIComponent(p.location || "Southern California")}&output=embed`,
        };
        const description = ktm ? "The KTM 300 EXC is a high-performance enduro dirt bike built for riders who demand power, control, and confidence across technical terrain. Known for its lightweight design and strong low-end torque, this bike excels on trails, hills, and off-road tracks where precision matters most.\n\nWith responsive handling and race-proven suspension, the 300 EXC delivers a smooth yet aggressive ride, making it ideal for intermediate to advanced riders. Whether you’re tackling rocky trails or pushing limits on open terrain, this bike offers the performance and reliability needed for an unforgettable ride.\n\nPerfect for off-road adventures, training sessions, and adrenaline-packed excursions." : p.description || `Explore the ${p.name} with MXSoCal. Our team can help with sizing, equipment selection, and rental availability. Each rental is checked before collection. Contact us to plan your next riding experience.`;
        await p.update({ description, attributes: { ...p.attributes, details } }, { transaction });
        updated++;
      }
      if (ktm && !p.attributes?.details?.gallery) {
        await p.update({ images: ["/images/bikes/bb11e.png"], attributes: { ...p.attributes, details: { ...p.attributes.details, gallery: ["7a4a5.png", "9e6e4.png", "63b2d.png", "c125c.png", "05378.png"].map(file => `/images/product-detail/${file}`) } } }, { transaction });
      }
      for (const [index, demo] of [
        { title: "Ready for an unforgettable ride", authorName: "Alex Taylor", comment: "The equipment was clean and ready when we arrived. The team explained the setup clearly, and the rental made our day on the trails easy and enjoyable.", score: 5, status: "approved" },
        { title: "Great equipment and a helpful team", authorName: "Jordan Miller", comment: "A smooth rental experience from start to finish. The team helped us choose the right equipment and answered our questions before we headed out. Would rent again.", score: 4, status: "approved" },
        { title: "Demo review awaiting moderation", authorName: "Demo Reviewer", comment: "This sample review is pending approval and must never appear on the public product page or affect its rating.", score: 1, status: "pending" },
      ].entries()) {
        const [, created] = await Review.findOrCreate({ where: { productId: p.id, title: demo.title, authorName: demo.authorName }, defaults: { productId: p.id, title: demo.title, authorName: demo.authorName, comment: demo.comment, status: demo.status, email: `demo-${index}@example.com`, rating: demo.score, ratings: ratings(demo.score), images: index === 0 && ktm ? ["9e6e4.png", "63b2d.png", "c125c.png"].map(file => `/images/product-detail/${file}`) : [], createdAt: new Date(Date.now() - index * 86400000) }, transaction });
        if (created) reviewsAdded++;
      }
    }
  });
  await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS products_public_slug_unique ON "Products" (slug)');
  console.log(`Seeded editable details for ${updated} products and ${reviewsAdded} demo reviews. Existing content preserved; only approved reviews are public.`);
})().catch(error => { console.error(`Product detail seed failed (${error.name}). No content changes committed.`); process.exitCode = 1; }).finally(() => sequelize.close());
