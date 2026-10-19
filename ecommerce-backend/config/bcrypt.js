const bcryptjs = require("bcryptjs");

class BcryptService {
  constructor() {
    this.saltRounds = 12;
  }

  async hashPassword(plainTextPassword) {
    try {
      if (!plainTextPassword || typeof plainTextPassword !== "string") {
        throw new Error("Password must be a non-empty string");
      }

      const hashedPassword = await bcryptjs.hash(
        plainTextPassword,
        this.saltRounds
      );
      return hashedPassword;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  async comparePassword(plainTextPassword, hashedPassword) {
    try {
      if (!plainTextPassword || typeof plainTextPassword !== "string") {
        throw new Error("Plain text password must be a non-empty string");
      }

      if (!hashedPassword || typeof hashedPassword !== "string") {
        throw new Error("Hashed password must be a non-empty string");
      }

      const isMatch = await bcryptjs.compare(plainTextPassword, hashedPassword);
      return isMatch;
    } catch (error) {
      throw new Error(`Password comparison failed: ${error.message}`);
    }
  }
  validatePasswordStrength(password) {
    const result = {
      isValid: true,
      messages: [],
    };

    if (!password || typeof password !== "string") {
      result.isValid = false;
      result.messages.push("Password must be a string");
      return result;
    }

    if (password.length < 8) {
      result.isValid = false;
      result.messages.push("Password must be at least 8 characters long");
    }

    if (!/(?=.*[a-z])/.test(password)) {
      result.isValid = false;
      result.messages.push(
        "Password must contain at least one lowercase letter"
      );
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      result.isValid = false;
      result.messages.push(
        "Password must contain at least one uppercase letter"
      );
    }

    if (!/(?=.*\d)/.test(password)) {
      result.isValid = false;
      result.messages.push("Password must contain at least one number");
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      result.isValid = false;
      result.messages.push(
        "Password must contain at least one special character (@$!%*?&)"
      );
    }

    return result;
  }
}

// Create singleton instance
const bcryptService = new BcryptService();

module.exports = bcryptService;
