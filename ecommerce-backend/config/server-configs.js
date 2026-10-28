module.exports = {
  PORT: process.env.PORT || 8000,
  CORS: {
    // Allow every origin while retaining credentialed requests (cookies).
    // A literal "*" cannot be used with credentials in browsers.
    origin: true,
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400,
  },
};
