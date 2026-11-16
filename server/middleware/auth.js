const jwt = require('jsonwebtoken');
const db = require('../services/dbAdapter');

const JWT_SECRET = process.env.JWT_SECRET || 'mit_exchange_hub_jwt_super_secret_key_2026_cse_pbl';

const protect = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please log in to proceed.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.users.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The account associated with this session no longer exists.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by an administrator. Please contact campus moderation.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token. Please log in again.'
    });
  }
};

// Role-based authorization guard
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to roles: [${roles.join(', ')}]. Your role is '${req.user.role}'.`
      });
    }

    next();
  };
};

// Optional auth for public routes (e.g. browsing listings) that can enhance response if logged in
const optionalAuth = async (req, res, next) => {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.users.findById(decoded.id);
      if (user && user.status !== 'suspended') {
        req.user = user;
      }
    } catch (e) {
      // Ignore token failure on optional route
    }
  }

  next();
};

module.exports = { protect, authorize, optionalAuth, JWT_SECRET };
