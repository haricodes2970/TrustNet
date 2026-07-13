const cors = require('cors');

const corsMiddleware = cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
});

module.exports = corsMiddleware;
