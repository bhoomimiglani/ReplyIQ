const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Conversation = require('../models/Conversation');
const Ticket = require('../models/Ticket');
const KnowledgeBase = require('../models/KnowledgeBase');
const { protect, requireAdmin } = require('../middleware/auth');

router.use(protect, requireAdmin);

// @route   GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalTenants,
      activeTenants,
      totalConversations,
      totalTickets,
      totalDocuments
    ] = await Promise.all([
      User.countDocuments(),
      Tenant.countDocuments(),
      Tenant.countDocuments({ isActive: true }),
      Conversation.countDocuments(),
      Ticket.countDocuments(),
      KnowledgeBase.countDocuments({ isActive: true })
    ]);
    
    res.json({
      stats: {
        totalUsers,
        totalTenants,
        activeTenants,
        totalConversations,
        totalTickets,
        totalDocuments
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// @route   GET /api/admin/tenants
router.get('/tenants', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    
    const total = await Tenant.countDocuments(query);
    const tenants = await Tenant.find(query)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    res.json({ tenants, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// @route   PUT /api/admin/tenants/:id
router.put('/tenants/:id', async (req, res) => {
  try {
    const { isActive, plan, limits } = req.body;
    const updates = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (plan) updates.plan = plan;
    if (limits) updates.limits = limits;
    
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    
    res.json({ success: true, tenant });
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .populate('tenantId', 'name plan')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    res.json({ users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// @route   PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const { isActive, role } = req.body;
    const updates = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (role) updates.role = role;
    
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;
