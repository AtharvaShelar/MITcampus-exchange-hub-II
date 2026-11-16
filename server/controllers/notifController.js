const db = require('../services/dbAdapter');

// @route   GET /api/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await db.notifications.find({ toEmail: req.user.email }, { createdAt: -1 });
    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (err) {
    next(err);
  }
};

// @route   PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res, next) => {
  try {
    const notif = await db.notifications.findById(req.params.id) ||
                  await db.notifications.findOne({ id: req.params.id });

    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (notif.toEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const updated = await db.notifications.findByIdAndUpdate(notif.id || notif._id, { read: true });

    res.json({
      success: true,
      notification: updated
    });
  } catch (err) {
    next(err);
  }
};

// @route   PATCH /api/notifications/mark-all-read
exports.markAllAsRead = async (req, res, next) => {
  try {
    await db.notifications.updateMany({ toEmail: req.user.email }, { read: true });
    res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (err) {
    next(err);
  }
};
