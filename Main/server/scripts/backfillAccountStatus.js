// Phase 16C: backfill accountStatus for users that existed before this
// field was added to the User schema. A Mongoose schema `default` only
// applies at document-creation time (or when the path is explicitly unset
// and then accessed) - it does NOT retroactively populate existing
// documents in MongoDB, so every pre-existing user's accountStatus would
// otherwise read as undefined until they hit a transition write.
//
// Safe to run any number of times: each user's accountStatus is
// recomputed from their CURRENT emailVerified/verificationStatus values
// via the same computeAccountStatus() used by every live transition path
// (auth.routes.js, verificationController.js, adminVerificationService.js)
// - re-running never overwrites a value with something different unless
// the source fields themselves changed, and never touches any other field.
//
// Usage:
//   node scripts/backfillAccountStatus.js

require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const { computeAccountStatus } = require("../src/services/accountStatus.service");

if (process.env.MONGODB_DNS_SERVERS) {
  dns.setServers(process.env.MONGODB_DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean));
}

async function backfillAccountStatus() {
  const cursor = User.find({}).select("emailVerified verificationStatus accountStatus").cursor();

  const counts = {};
  let scanned = 0;
  let updated = 0;

  for await (const user of cursor) {
    scanned += 1;
    const next = computeAccountStatus(user);
    counts[next] = (counts[next] || 0) + 1;

    if (user.accountStatus !== next) {
      await User.updateOne({ _id: user._id }, { $set: { accountStatus: next } });
      updated += 1;
    }
  }

  return { scanned, updated, counts };
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    const result = await backfillAccountStatus();
    console.log(`Scanned ${result.scanned} user(s), updated ${result.updated}.`);
    console.log("Resulting accountStatus distribution:", result.counts);
    process.exit(0);
  } catch (error) {
    console.error("Failed to backfill accountStatus:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { backfillAccountStatus };
