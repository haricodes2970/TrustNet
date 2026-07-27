const dns = require('dns');
const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    // MONGODB_DNS_SERVERS was previously parsed in env.js but never applied
    // anywhere -- some hosts/sandboxes have a default resolver that can't
    // answer SRV queries, which mongodb+srv:// URIs require. Point Node's
    // resolver at the given servers (e.g. 8.8.8.8,1.1.1.1) before connecting.
    if (env.MONGODB_DNS_SERVERS.length) {
      dns.setServers(env.MONGODB_DNS_SERVERS);
    }

    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

module.exports = connectDB;
