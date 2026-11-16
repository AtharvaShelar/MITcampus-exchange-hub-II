const db = require('../services/dbAdapter');

// @route   POST /api/reports
exports.createReport = async (req, res, next) => {
  try {
    const { type, targetId, reason, description } = req.body;

    if (!type || !targetId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide report type (Product or User), target identifier, and reason.'
      });
    }

    if (!['Product', 'User'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be either Product or User.' });
    }

    let targetLabel = '';
    if (type === 'Product') {
      const prod = await db.products.findById(targetId);
      if (!prod) {
        return res.status(404).json({ success: false, message: 'Reported product not found.' });
      }
      targetLabel = prod.name;
    } else {
      if (targetId.toLowerCase() === req.user.email.toLowerCase()) {
        return res.status(400).json({ success: false, message: 'You cannot report your own account.' });
      }
      const u = await db.users.findOne({ email: targetId.toLowerCase() });
      targetLabel = u ? u.name : targetId;
    }

    // Check duplicate pending report by same reporter
    const existing = await db.reports.findOne({
      type,
      targetId: String(targetId),
      reporterEmail: req.user.email,
      status: 'Pending'
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `You already have an active pending report submitted for this ${type.toLowerCase()}.`
      });
    }

    const reportId = 'rep_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newReport = await db.reports.create({
      id: reportId,
      type,
      targetId: String(targetId),
      targetLabel,
      reporterEmail: req.user.email,
      reporterName: req.user.name,
      reason,
      description: description ? description.trim() : 'No extra details provided.',
      status: 'Pending',
      date: new Date().toLocaleDateString('en-GB')
    });

    // Notify admins
    const admins = await db.users.find({ role: 'admin' });
    for (const a of admins) {
      await db.notifications.create({
        id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
        toEmail: a.email,
        type: 'report',
        title: '🚩 New Moderation Report',
        message: `${req.user.name} reported ${type.toLowerCase()} "${targetLabel}" for "${reason}".`,
        time: new Date().toLocaleString('en-GB'),
        read: false,
        link: 'admin'
      });
    }

    await db.activities.create({
      type: 'report',
      text: `${req.user.name} reported ${type.toLowerCase()} "${targetLabel}".`,
      time: new Date().toLocaleString('en-GB')
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Campus administrators will review it promptly.',
      report: newReport
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/reports
exports.getReports = async (req, res, next) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    let reports = [];

    if (isAdmin) {
      // Admins see all reports
      reports = await db.reports.find({}, { createdAt: -1 });
    } else {
      // Normal students see reports they created
      reports = await db.reports.find({ reporterEmail: req.user.email }, { createdAt: -1 });
    }

    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (err) {
    next(err);
  }
};

// @route   PATCH /api/reports/:id
exports.updateReportStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Under Review', 'Resolved', 'Dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid report status.' });
    }

    const report = await db.reports.findById(req.params.id) ||
                   await db.reports.findOne({ id: req.params.id });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const updated = await db.reports.findByIdAndUpdate(report.id || report._id, { status });

    // Notify the reporting student
    await db.notifications.create({
      id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
      toEmail: report.reporterEmail,
      type: 'report',
      title: 'Report Status Update',
      message: `Your report on "${report.targetLabel}" has been marked as "${status}".`,
      time: new Date().toLocaleString('en-GB'),
      read: false,
      link: 'report'
    });

    await db.activities.create({
      type: 'report',
      text: `Report on "${report.targetLabel}" marked as ${status} by admin.`,
      time: new Date().toLocaleString('en-GB')
    });

    res.json({
      success: true,
      message: `Report marked as ${status}.`,
      report: updated
    });
  } catch (err) {
    next(err);
  }
};
