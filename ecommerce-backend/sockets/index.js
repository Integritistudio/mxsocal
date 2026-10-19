const { Server } = require("socket.io");
let io;

function initSockets(server) {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:3001"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const raw = socket.handshake.headers.cookie?.split(";").map(value => value.trim()).find(value => value.startsWith("token="))?.slice(6);
      const token = socket.handshake.auth?.token || (raw && decodeURIComponent(raw));
      const payload = token && require("../helpers/jwt").verifyToken(token);
      const user = payload && await require("../models/user.model").findByPk(payload.id, { attributes: ["id", "role", "tokenVersion"] });
      if (!user || !["admin", "manager"].includes(user.role) || (payload.version || 0) !== user.tokenVersion) return next(new Error("Staff access required"));
      socket.data.userId = user.id;
      next();
    } catch { next(new Error("Authentication failed")); }
  });
  io.on("connection", (socket) => {
    const id = socket.id;
    console.log("Socket connected:", id);

    socket.on("subscribe", (room) => {
      if (room !== "admin" && room !== `user:${socket.data.userId}`) return;
      socket.join(room);
      console.log(`Socket ${id} joined room ${room}`);
    });

    socket.on("unsubscribe", (room) => {
      if (!room) return;
      socket.leave(room);
      console.log(`Socket ${id} left room ${room}`);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", id);
    });
  });
}

function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

function emitNotification(room, payload) {
  if (!io) return;
  if (room) {
    io.to(room).emit("notification", payload);
  } else {
    io.emit("notification", payload);
  }
}

module.exports = { initSockets, getIO, emitNotification };
