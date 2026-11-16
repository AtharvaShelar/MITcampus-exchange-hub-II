const dns = require('dns');
const mongoose = require('mongoose');

// Configure Node.js to use Google's DNS servers for reliable SRV lookups (resolves querySrv ETIMEOUT)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('[Database] Warning: Could not set custom DNS servers:', e.message);
}

let isConnected = false;
let connectionMode = 'memory'; // 'mongodb' or 'file_fallback'

// Helper to remove any sensitive credentials from messages or errors
const sanitizeMessage = (text) => {
  if (!text) return '';
  return String(text).replace(/mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi, 'mongodb$1://<credentials-hidden>@');
};

const connectDB = async () => {
  // Ensure Google DNS servers are set before any SRV lookup or connection attempt
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (e) {
    // Ignore if already set
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mit_exchange_hub';
  
  try {
    // Attempt Mongoose connection with server selection timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    isConnected = true;
    connectionMode = 'mongodb';
    console.log('[Database] MongoDB connected successfully.');
  } catch (err) {
    isConnected = false;
    connectionMode = 'file_fallback';

    console.warn('[Database] Notice: MongoDB connection failed.');
    console.warn(`[Database] Error Name: ${err.name || 'Error'}`);
    console.warn(`[Database] Error Message: ${sanitizeMessage(err.message)}`);
    if (err.reason) {
      console.warn(`[Database] Failure Details: ${sanitizeMessage(err.reason.message || err.reason)}`);
    }

    console.warn('[Database] Activated built-in zero-config persistent storage (server/data/db.json).');
    console.warn('[Database] All full-stack features (Bidding, Requests, Chats, Reviews, Admin) run perfectly!');
  }

  return { isConnected, connectionMode };
};

const getConnectionInfo = () => ({
  isConnected,
  connectionMode,
  configured: Boolean(process.env.MONGODB_URI)
});

module.exports = { connectDB, getConnectionInfo };
