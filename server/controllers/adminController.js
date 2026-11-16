const db = require('../services/dbAdapter');

// @route   GET /api/admin/stats
exports.getStats = async (req, res, next) => {
  try {
    const totalUsers = await db.users.countDocuments({});
    const activeUsers = await db.users.countDocuments({ status: 'active' });
    const suspendedUsers = await db.users.countDocuments({ status: 'suspended' });

    const totalListings = await db.products.countDocuments({});
    const activeListings = await db.products.countDocuments({ status: 'available' });
    const soldListings = await db.products.countDocuments({ status: 'sold' });
    const activeAuctions = await db.products.countDocuments({ pricingModel: 'bidding', auctionStatus: 'active' });
    const totalBids = await db.bids.countDocuments({});

    const pendingReports = await db.reports.countDocuments({ status: 'Pending' });
    const pendingRequests = await db.requests.countDocuments({ status: 'Pending' });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalListings,
        activeListings,
        soldListings,
        activeAuctions,
        totalBids,
        pendingReports,
        pendingRequests
      }
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/admin/users
exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    let query = {};

    if (role && role !== 'all') query.role = role;
    if (status && status !== 'all') query.status = status;

    let users = await db.users.find(query, { createdAt: -1 });

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.department.toLowerCase().includes(term)
      );
    }

    // Attach user listing counts
    const enriched = [];
    for (const u of users) {
      const count = await db.products.countDocuments({ sellerEmail: u.email });
      const { password, ...safe } = u;
      enriched.push({
        ...safe,
        listingsCount: count
      });
    }

    res.json({
      success: true,
      count: enriched.length,
      users: enriched
    });
  } catch (err) {
    next(err);
  }
};

// @route   PATCH /api/admin/users/:id/status
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await db.users.findById(req.params.id) ||
                 await db.users.findOne({ email: req.params.id });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.email === req.user.email) {
      return res.status(400).json({ success: false, message: 'Administrators cannot suspend their own account.' });
    }

    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    const updated = await db.users.findByIdAndUpdate(user.id || user._id, { status: newStatus });

    await db.activities.create({
      type: 'user',
      text: `Admin marked ${user.name} (${user.email}) as ${newStatus}.`,
      time: new Date().toLocaleString('en-GB')
    });

    res.json({
      success: true,
      message: `User ${user.email} is now ${newStatus}.`,
      user: {
        id: updated.id || updated._id,
        email: updated.email,
        name: updated.name,
        status: newStatus
      }
    });
  } catch (err) {
    next(err);
  }
};

// @route   PATCH /api/admin/users/:id/role
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['student', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const user = await db.users.findById(req.params.id) ||
                 await db.users.findOne({ email: req.params.id });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updated = await db.users.findByIdAndUpdate(user.id || user._id, { role });

    await db.activities.create({
      type: 'user',
      text: `Admin changed role of ${user.name} (${user.email}) to ${role}.`,
      time: new Date().toLocaleString('en-GB')
    });

    res.json({
      success: true,
      message: `Role for ${user.email} updated to ${role}.`,
      user: {
        id: updated.id || updated._id,
        email: updated.email,
        name: updated.name,
        role
      }
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/admin/activity
exports.getActivity = async (req, res, next) => {
  try {
    const activities = await db.activities.find({}, { createdAt: -1 });
    res.json({
      success: true,
      count: activities.length,
      activity: activities.slice(0, 50)
    });
  } catch (err) {
    next(err);
  }
};
