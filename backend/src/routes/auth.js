const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { generateToken, protect } = require('../middleware/auth');
const logger = require('../utils/logger');

// Validation middleware
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

// @route   POST /api/auth/register
// @desc    Register a new business user
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('organization').trim().notEmpty().withMessage('Organization name is required')
], handleValidation, async (req, res) => {
  try {
    const { name, email, password, organization } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Create user first
    const user = new User({
      name,
      email,
      password,
      organization,
      role: 'business'
    });
    await user.save();

    // Now create tenant with user as owner
    const tenant = new Tenant({
      name: organization,
      owner: user._id,
      apiKey: uuidv4().replace(/-/g, '')
    });
    await tenant.save();

    // Link tenant to user
    user.tenantId = tenant._id;
    await user.save({ validateBeforeSave: false });
    
    const token = generateToken(user._id);
    
    logger.info(`New user registered: ${email}, tenant: ${tenant._id}`);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
        tenantId: user.tenantId
      },
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        settings: tenant.settings,
        apiKey: tenant.apiKey
      }
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required')
], handleValidation, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated. Contact support.' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    
    // Get tenant info
    let tenant = null;
    if (user.tenantId) {
      tenant = await Tenant.findById(user.tenantId);
    }
    
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
        tenantId: user.tenantId
      },
      tenant: tenant ? {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        settings: tenant.settings,
        apiKey: tenant.apiKey,
        usage: tenant.usage
      } : null
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
router.get('/me', protect, async (req, res) => {
  try {
    const user = req.user;
    let tenant = null;
    
    if (user.tenantId) {
      tenant = await Tenant.findById(user.tenantId);
    }
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
        tenantId: user.tenantId,
        lastLogin: user.lastLogin
      },
      tenant: tenant ? {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        settings: tenant.settings,
        apiKey: tenant.apiKey,
        usage: tenant.usage,
        limits: tenant.limits
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
router.put('/profile', protect, [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('organization').optional().trim().notEmpty()
], handleValidation, async (req, res) => {
  try {
    const { name, organization } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (organization) updates.organization = organization;
    
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    
    // Update tenant name if organization changed
    if (organization && req.tenant) {
      await Tenant.findByIdAndUpdate(req.tenant._id, { name: organization });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// @route   PUT /api/auth/change-password
router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], handleValidation, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Password change failed' });
  }
});

module.exports = router;
