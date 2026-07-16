// One-time bootstrap: promote an existing user to admin.
// Usage: node scripts/seed-admin.js <email>
// Or set ADMIN_EMAIL env var. Safe to run multiple times (idempotent update).

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");

const email = process.argv[2] || process.env.ADMIN_EMAIL;

if (!email) {
  console.error("Provide an admin email: node scripts/seed-admin.js admin@example.com");
  process.exit(1);
}

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.error(`No user found with email: ${normalizedEmail}`);
      process.exit(1);
    }

    if (user.role === "admin") {
      console.log(`User ${normalizedEmail} is already an admin.`);
    } else {
      user.role = "admin";
      await user.save();
      console.log(`Promoted ${normalizedEmail} to admin.`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Failed to seed admin:", error.message);
    process.exit(1);
  }
}

seedAdmin();
