const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { protect, requireBusiness } = require('../middleware/auth');

router.use(protect, requireBusiness);

// @route   GET /api/users/team
// @desc    Get team members for tenant
router.get('/team', async (req, res) => {
  try {
    const users = await User.find({ tenantId: req.tenant._id })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// @route   POST /api/users/invite
// @desc    Invite a team member (agent)
router.post('/invite', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    
    const { name, email, role = 'agent' } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    
    // Create agent with temp password
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    
    const user = new User({
      name,
      email,
      password: tempPassword,
      role: role === 'agent' ? 'agent' : 'business',
      tenantId: req.tenant._id,
      organization: req.tenant.name
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      user: { id: user._id, name, email, role: user.role },
      tempPassword, // In production, send via email
      message: 'Team member invited successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to invite team member' });
  }
});

// @route   PUT /api/users/settings
// @desc    Update tenant settings (bot customization)
router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    
    const tenant = await Tenant.findByIdAndUpdate(
      req.tenant._id,
      { $set: { settings: { ...req.tenant.settings.toObject(), ...settings } } },
      { new: true }
    );
    
    res.json({ success: true, settings: tenant.settings });
  } catch (error) {
    res.status(500).json({ error: 'Settings update failed' });
  }
});

// @route   GET /api/users/settings
router.get('/settings', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.tenant._id);
    res.json({ settings: tenant.settings, apiKey: tenant.apiKey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// @route   POST /api/users/regenerate-api-key
router.post('/regenerate-api-key', async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const newKey = uuidv4().replace(/-/g, '');
    
    await Tenant.findByIdAndUpdate(req.tenant._id, { apiKey: newKey });
    
    res.json({ success: true, apiKey: newKey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to regenerate API key' });
  }
});

module.exports = router;
