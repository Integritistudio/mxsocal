const User = require("../models/user.model");

exports.getUsers = async (req, res) => {
  try {
    const { role = "user" } = req.query;
    const users = await User.findAll({
      where: { role },
      attributes: { exclude: ["password"] },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    if (["password", "role", "emailVerifiedAt", "tokenVersion"].some(key => Object.hasOwn(req.body || {}, key))) return res.status(400).json({ message: "Roles, verification, and passwords cannot be changed here. Customers manage their own passwords." });
    const fields = ["name", "phone", "country", "state", "city", "zipCode", "bio"];
    const data = Object.fromEntries(fields.filter(key => typeof req.body[key] === "string" && req.body[key].length <= 2000).map(key => [key, req.body[key]]));

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "manager" && Array.isArray(req.body.permissions) && req.body.permissions.every(p => typeof p === "string" && p.length < 100)) data.permissions = req.body.permissions;
    await user.update(data);

    res.json({ message: "User updated", user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.destroy();
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createManager = async (req, res) => {
  const { name, email, password, permissions = [] } = req.body || {};
  if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" || password.length < 12 || Buffer.byteLength(password) > 72 || !Array.isArray(permissions) || !permissions.every(p => typeof p === "string" && p.length < 100)) return res.status(400).json({ message: "Enter a name, valid email, password of 12 or more characters, and permissions." });
  try { const user = await User.create({ name: name.trim(), email: email.trim().toLowerCase(), password, permissions, role: "manager", emailVerifiedAt: new Date() }); res.status(201).json({ user: user.toJSON() }); }
  catch { res.status(409).json({ message: "Unable to add this manager. Check whether the email is already registered." }); }
};
