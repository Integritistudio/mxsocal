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
const { initSockets } = require("./sockets");

const app = express();
const server = http.createServer(app);

app.use(cors(serverConfigs.CORS));
app.post("/rental-checkout/webhook", express.raw({ type: "application/json" }), require("./controllers/rental-checkout.controller").webhook);
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
