// Idempotent bootstrap: ensure a default administrator account exists.
// Usage:
//   node scripts/seed-admin.js [email] [password]
// Or via env vars:
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-admin.js
//
// Behavior (safe to run any number of times):
//   - If no user exists with this email: create one, password hashed with
//     bcrypt exactly as the real POST /auth/register flow does, role=admin.
//   - If a user exists and is not an admin: promote their role to admin.
//     Their existing password is left untouched unless ADMIN_RESET_PASSWORD
//     is explicitly set (see below).
//   - If a user exists and is already an admin: no-op, unless
//     ADMIN_RESET_PASSWORD is set.
//
// ADMIN_RESET_PASSWORD=true forces the existing account's password to be
// overwritten with the given/default password. Off by default so routine
// re-runs of this script can never silently change a live account's
// credentials -- only set it when you explicitly intend a password reset.
//
// Credentials are never hardcoded in application request-handling code --
// this is a one-time operational script, not a runtime code path, and its
// defaults exist only so the platform always has a documented recovery
// account. Override ADMIN_EMAIL/ADMIN_PASSWORD for any other environment.

require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

// Same SRV-resolution fix as src/config/database.js -- some environments'
// default DNS resolver can't answer the SRV query mongodb+srv:// needs.
if (process.env.MONGODB_DNS_SERVERS) {
  dns.setServers(process.env.MONGODB_DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean));
}

const DEFAULT_ADMIN_EMAIL = "trustnet929@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "Admin@trustnet";

const email = process.argv[2] || process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
const password = process.argv[3] || process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

// Mirrors generateUniqueUsername() in src/routes/auth.routes.js so a seeded
// admin gets a username exactly as the real register flow would produce.
async function generateUniqueUsername(seedEmail) {
  const base = (seedEmail.split("@")[0] || "user")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const candidate = base || "user";
  let username = candidate;
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await User.findOne({ username });
    if (!existing) return username;
    suffix += 1;
    username = `${candidate}${suffix}`;
  }
}

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    const forceResetPassword = process.env.ADMIN_RESET_PASSWORD === "true";

    if (!existing) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const username = await generateUniqueUsername(normalizedEmail);

      await User.create({
        email: normalizedEmail,
        password: hashedPassword,
        fullName: "TrustNet Administrator",
        username,
        designation: "Administrator",
        role: "admin",
        isVerified: true,
        verificationStatus: "approved",
      });
      console.log(`Created default administrator: ${normalizedEmail}`);
    } else {
      let changed = false;

      if (existing.role !== "admin") {
        existing.role = "admin";
        changed = true;
      }

      if (forceResetPassword) {
        existing.password = await bcrypt.hash(password, 10);
        changed = true;
      }

      if (changed) {
        await existing.save();
        console.log(
          `Updated existing user ${normalizedEmail}` +
            `${existing.role === "admin" ? " (role=admin)" : ""}` +
            `${forceResetPassword ? " (password reset)" : ""}.`
        );
      } else {
        console.log(`Administrator already exists: ${normalizedEmail} (no change made).`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Failed to seed admin:", error.message);
    process.exit(1);
  }
}

seedAdmin();
