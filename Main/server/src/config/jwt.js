module.exports = {
  accessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "trustnet-access-secret",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "trustnet-refresh-secret",
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
};
