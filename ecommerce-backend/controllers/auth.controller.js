const User = require("../models/user.model");
const { generateToken } = require("../helpers/jwt");

exports.register = (req, res) => require("./customer-account.controller").signup(req, res);

exports.login = async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;
    if (!email || typeof password !== "string" || !password || Buffer.byteLength(password) > 72)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });
    if (req.staffLogin ? !["admin", "manager"].includes(user.role) : user.role !== "user") return res.status(403).json({ message: "Invalid email or password" });
    if (user?.role === "manager") {
      const viewAccess = [
        "product:view",
        "booking:view",
        "coach:view",
        "dashboard:view",
      ];
      if (
        user?.permissions?.length <= 0 ||
        viewAccess?.every((access) => !user?.permissions?.includes(access))
      ) {
        return res.status(401).json({ message: "Permission denied by Admin!" });
      }
    }

    if (user.role === "user" && !user.emailVerifiedAt) return res.status(401).json({ message: "Verify your email using your invitation or signup code before signing in." });
    return require("./customer-account.controller").startSession(res, user);

  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(503).json({ message: "Unable to sign in. Please try again shortly." });
  }
};

exports.logout = async (req, res) => {
  console.log("Logout requested");
  try {
    await req.account.increment("tokenVersion");
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
    });
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.me = async (req, res) => res.json(req.account.toJSON());
exports.updateProfile = (req, res) => require("./customer-account.controller").updateProfile(req, res);
