require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, getConnectionInfo } = require('./config/db');
const { startAuctionScheduler } = require('./services/auctionService');
const errorHandler = require('./middleware/errorHandler');
const db = require('./services/dbAdapter');
const { seedDatabase } = require('./scripts/seed');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const bidRoutes = require('./routes/bidRoutes');
const requestRoutes = require('./routes/requestRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notifRoutes = require('./routes/notifRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded user files
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Serve Frontend Static Files
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/conversations', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/upload', uploadRoutes);

// Health check & System info endpoint
app.get('/api/health', (req, res) => {
  const dbInfo = getConnectionInfo();
  res.json({
    status: 'online',
    appName: 'MIT Campus Exchange Hub API',
    version: '2.0.0-fullstack',
    database: dbInfo,
    timestamp: new Date().toISOString()
  });
});

// Development re-seed endpoint (useful for jury demos and Reset Demo Data button)
app.post('/api/seed', async (req, res, next) => {
  try {
    await seedDatabase();
    res.json({
      success: true,
      message: 'Database has been cleanly restored to initial demo state.'
    });
  } catch (err) {
    next(err);
  }
});

// SPA fallback: Return index.html for any frontend client-side route
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return next();
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Centralized error handling
app.use(errorHandler);

// Initialize DB, background schedulers, and start HTTP listener
const startServer = async () => {
  await connectDB();

  // If no users exist, auto-seed with sample demo data
  const userCount = await db.users.countDocuments({});
  if (userCount === 0) {
    console.log('[Startup] No existing data detected. Auto-seeding initial marketplace data...');
    await seedDatabase();
  }

  // Start background auction monitoring
  const interval = parseInt(process.env.AUCTION_CHECK_INTERVAL_MS, 10) || 15000;
  startAuctionScheduler(interval);

  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🎓 MIT CAMPUS EXCHANGE HUB — FULL-STACK APPLICATION`);
    console.log(`🚀 Server running on: http://localhost:${PORT}`);
    console.log(`📦 Serving frontend from: ${publicPath}`);
    console.log(`🖼️  Serving uploads from:  ${uploadsPath}`);
    console.log(`🛡️  Role-based auth: Student, Staff, Admin`);
    console.log(`🔨 Bidding & Auction Engine: ACTIVE`);
    console.log(`======================================================\n`);
  });

  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
