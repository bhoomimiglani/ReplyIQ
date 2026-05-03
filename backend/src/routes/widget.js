const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');

// @route   GET /api/widget/config/:apiKey
// @desc    Get widget configuration (public endpoint for embedding)
router.get('/config/:apiKey', async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ apiKey: req.params.apiKey, isActive: true })
      .select('name settings');
    
    if (!tenant) {
      return res.status(404).json({ error: 'Widget not found' });
    }
    
    // Return only public-safe settings
    res.json({
      botName: tenant.settings.botName,
      welcomeMessage: tenant.settings.welcomeMessage,
      primaryColor: tenant.settings.primaryColor,
      widgetPosition: tenant.settings.widgetPosition,
      botAvatar: tenant.settings.botAvatar,
      organizationName: tenant.name
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load widget config' });
  }
});

module.exports = router;
