module.exports = {
  PORT: process.env.PORT || 8000,
  CORS: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://7661f35b6798.ngrok-free.app",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400,
  },
};
