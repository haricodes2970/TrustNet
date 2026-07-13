const dotenvResult = require('dotenv').config();

const requiredVariables = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLIENT_URL',
];

const missingVariables = requiredVariables.filter((variableName) => !process.env[variableName]);
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME;

if (!cloudinaryCloudName) {
  missingVariables.push('CLOUDINARY_CLOUD_NAME');
}

if (missingVariables.length > 0) {
  const uniqueMissingVariables = [...new Set(missingVariables)];
  console.error(`Missing required environment variable${uniqueMissingVariables.length > 1 ? 's' : ''}: ${uniqueMissingVariables.join(', ')}`);
  process.exit(1);
}

if (!process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_NAME) {
  console.warn('CLOUDINARY_NAME is deprecated. Rename it to CLOUDINARY_CLOUD_NAME in your environment file.');
}

const config = Object.freeze({
  PORT: Number(process.env.PORT || 5000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DOTENV_LOADED: !dotenvResult.error,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
  CLOUDINARY_CLOUD_NAME: cloudinaryCloudName,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLIENT_URL: process.env.CLIENT_URL,
  MONGODB_DNS_SERVERS: process.env.MONGODB_DNS_SERVERS
    ? process.env.MONGODB_DNS_SERVERS.split(',').map((server) => server.trim()).filter(Boolean)
    : [],
});

module.exports = config;
