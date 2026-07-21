const jwt = require("jsonwebtoken");
const User = require("../../../src/models/User");
const jwtConfig = require("../../../src/config/jwt");

// Creates a persisted User document and a matching signed access token, so
// integration tests can simulate `Authorization: Bearer <token>` without
// going through the real /auth/register + /auth/login flow. Mirrors the
// token shape auth.js actually verifies (payload.sub -> req.user.id,
// payload.email -> req.user.email).
async function createAuthenticatedTestUser(overrides = {}) {
  const unique = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

  const user = await User.create({
    fullName: overrides.fullName || "Test User",
    username: overrides.username || `testuser_${unique}`,
    email: overrides.email || `testuser_${unique}@example.com`,
    role: overrides.role || "builder",
    ...overrides,
  });

  const token = jwt.sign(
    { sub: user._id.toString(), email: user.email },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn }
  );

  return { user, token };
}

module.exports = { createAuthenticatedTestUser };
