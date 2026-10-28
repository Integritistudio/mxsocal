const express = require("express");
const http = require("http");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

require("dotenv").config();

const sequelize = require("./config/database");
const serverConfigs = require("./config/server-configs");
const logger = require("./helpers/logger");
const router = require("./routes");
require("./models/contact-email.model");
const { initSockets } = require("./sockets");

const app = express();
const server = http.createServer(app);

app.use(cors(serverConfigs.CORS));
app.post("/rental-checkout/webhook", express.raw({ type: "application/json" }), require("./controllers/rental-checkout.controller").webhook);
app.post("/ride-requests/webhook", express.raw({ type: "application/json" }), require("./controllers/ride-participant.controller").webhook);
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(express.urlencoded({ extended: true }));

const legacyFileUpload = fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  });
app.use((req, res, next) => (/^\/products\/[^/]+\/reviews\/?$/.test(req.path) || (req.path === "/auth/me/avatar" || (req.path === "/coach/photo" || req.path === "/products/photo" || req.path === "/stories/media"))) ? next() : legacyFileUpload(req, res, next));
app.use("/", router);

app.get("/", (req, res) => {
  res.send("<h1>Backend API</h1>");
});

//logger
app.use(logger);

sequelize
  .authenticate()
  .then(async () => {
    console.log("✅ PostgreSQL Connected!");
    await sequelize.sync({ alter: process.env.NODE_ENV === "development" });
    console.log("✅ Database models synced!");
    const rentalMaintenance = setInterval(() => { require("./controllers/rental-checkout.controller").runMaintenance().catch(() => console.warn("Booking maintenance will retry.")); }, 10000);
    rentalMaintenance.unref();
    let expiryBusy = false;
    const expireRideRequests = async () => {
      if (expiryBusy) return;
      expiryBusy = true;
      try { await require("./lib/ride-request-expiry").expireRequests(); }
      catch (error) { console.error("Ride request expiry will retry:", error.name); }
      finally { expiryBusy = false; }
    };
    const requestExpiryMaintenance = setInterval(expireRideRequests, 60000);
    requestExpiryMaintenance.unref();
    void expireRideRequests();
    let contactMailBusy = false;
    const deliverContactMail = async () => {
      if (contactMailBusy) return;
      contactMailBusy = true;
      try { await require("./lib/contact-email").deliver(); }
      catch (error) { console.error("Admin contact email worker will retry:", error.name); }
      finally { contactMailBusy = false; }
    };
    const contactMaintenance = setInterval(deliverContactMail, 10000);
    contactMaintenance.unref();
    void deliverContactMail();
    let rideMailBusy = false;
    const deliverRideMail = async () => {
      if (rideMailBusy) return;
      rideMailBusy = true;
      try { await require("./lib/ride-request-email").deliver(); }
      catch (error) { console.error("Ride request mail worker will retry:", error.name); }
      finally { rideMailBusy = false; }
    };
    const rideMailMaintenance = setInterval(deliverRideMail, 10000);
    rideMailMaintenance.unref();
    void deliverRideMail();
    const ridePaymentMaintenance = setInterval(() => { require("./lib/ride-participant-checkout").maintenance().catch(() => console.warn("Ride payment maintenance will retry.")); }, 30000);
    ridePaymentMaintenance.unref();

    initSockets(server);

    server.listen(serverConfigs.PORT, () => {
      console.log(`✅ Server running on port ${serverConfigs.PORT}`);
      console.log(
        "Server Timezone:",
        Intl.DateTimeFormat().resolvedOptions().timeZone
      );
    });
  })
  .catch((error) => {
    console.error("❌ Database Connection Error:", error);
  });

module.exports = app;
