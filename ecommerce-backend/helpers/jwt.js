const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";
const validSecret = () => JWT_SECRET && (process.env.NODE_ENV !== "production" || Buffer.byteLength(JWT_SECRET) >= 32);

// Generate JWT token
const generateToken = (userId, role, version = 0) => {
  if (!validSecret()) throw new Error("Configure a strong JWT_SECRET before signing in.");
  return jwt.sign(
    {
      id: userId,
      role: role,
      version,
      purpose: "session",
    },
    JWT_SECRET,
    {
      expiresIn: role === "user" ? "5d" : JWT_EXPIRY,
    }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    if (!validSecret()) return null;
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    return (!payload.purpose || payload.purpose === "session") ? payload : null;
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };
