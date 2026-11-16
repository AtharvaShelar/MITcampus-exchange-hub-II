const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../services/dbAdapter');
const { JWT_SECRET } = require('../middleware/auth');
const { sendVerificationEmail } = require('../services/emailService');

const getAllowedDomains = () => {
  const domainsStr = process.env.INSTITUTE_DOMAINS || 'demo.edu,mit.edu,mitadt.edu.in';
  return domainsStr.split(',').map(d => d.trim().toLowerCase());
};

const isInstituteEmail = (email) => {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase();
  const allowed = getAllowedDomains();
  return allowed.some(allowedDomain => domain === allowedDomain || domain.endsWith('.' + allowedDomain));
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id || user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const sanitizeUser = (user) => {
  const { password, ...safe } = user;
  return safe;
};

// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, department, year, role = 'student' } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, and department.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check institute domain
    if (!isInstituteEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: `Registration is restricted to verified institute email addresses (${getAllowedDomains().map(d => '@' + d).join(', ')}).`
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists
    const existing = await db.users.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this institute email is already registered. Please log in.'
      });
    }

    // Role validation: students/staff can register, admin cannot self-register unless seed
    const assignedRole = role === 'staff' ? 'staff' : 'student';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(24).toString('hex');
    const autoVerify = process.env.AUTO_VERIFY_EMAIL === 'true';

    const newUser = await db.users.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: assignedRole,
      department: department.trim(),
      year: year || (assignedRole === 'staff' ? 'Faculty / Staff' : '1st Year'),
      status: 'active',
      isVerified: autoVerify,
      verificationToken: autoVerify ? null : verificationToken,
      wishlist: [],
      rating: 5.0,
      ratingsCount: 0,
      joined: new Date().toLocaleDateString('en-GB')
    });

    if (!autoVerify) {
      await sendVerificationEmail({
        toEmail: cleanEmail,
        name: newUser.name,
        token: verificationToken,
        hostUrl: `${req.protocol}://${req.get('host')}`
      });
    }

    // Log platform activity
    await db.activities.create({
      type: 'user',
      text: `${newUser.name} registered as a ${assignedRole} (${newUser.department}).`,
      time: new Date().toLocaleString('en-GB')
    });

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: autoVerify
        ? 'Account created and verified successfully!'
        : 'Account created! Please check your email to verify your institute account.',
      token,
      user: sanitizeUser(newUser)
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your institute email and password.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.users.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. No account found for this institute email.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'This account is suspended. Please contact the campus admin.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await db.users.findById(req.user.id || req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const listingsCount = await db.products.countDocuments({ sellerEmail: user.email });
    const requestsCount = await db.requests.countDocuments({
      $or: [{ buyerEmail: user.email }, { sellerEmail: user.email }]
    });

    res.json({
      success: true,
      user: {
        ...sanitizeUser(user),
        listingsCount,
        requestsCount
      }
    });
  } catch (err) {
    next(err);
  }
};

// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, department, year } = req.body;
    const userId = req.user.id || req.user._id;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 3 characters long.'
      });
    }

    const updated = await db.users.findByIdAndUpdate(userId, {
      name: name.trim(),
      department: department ? department.trim() : req.user.department,
      year: year || req.user.year
    });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: sanitizeUser(updated)
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/auth/verify-email
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing verification token or email parameter.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.users.findOne({ email: cleanEmail, verificationToken: token });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token.'
      });
    }

    await db.users.findByIdAndUpdate(user.id || user._id, {
      isVerified: true,
      verificationToken: null
    });

    res.json({
      success: true,
      message: `Email ${cleanEmail} verified successfully! You can now participate in all marketplace and bidding activities.`
    });
  } catch (err) {
    next(err);
  }
};
