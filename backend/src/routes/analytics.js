const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Ticket = require('../models/Ticket');
const KnowledgeBase = require('../models/KnowledgeBase');
const { protect, requireBusiness } = require('../middleware/auth');

router.use(protect, requireBusiness);

// @route   GET /api/analytics/overview
router.get('/overview', async (req, res) => {
  try {
    const tenantId = req.tenant._id;
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const [
      totalConversations,
      activeConversations,
      resolvedConversations,
      escalatedConversations,
      totalTickets,
      openTickets,
      resolvedTickets,
      totalDocuments,
      processedDocuments
    ] = await Promise.all([
      Conversation.countDocuments({ tenantId, createdAt: { $gte: startDate } }),
      Conversation.countDocuments({ tenantId, status: 'active' }),
      Conversation.countDocuments({ tenantId, status: 'resolved', createdAt: { $gte: startDate } }),
      Conversation.countDocuments({ tenantId, escalated: true, createdAt: { $gte: startDate } }),
      Ticket.countDocuments({ tenantId, createdAt: { $gte: startDate } }),
      Ticket.countDocuments({ tenantId, status: { $in: ['open', 'in_progress'] } }),
      Ticket.countDocuments({ tenantId, status: 'resolved', createdAt: { $gte: startDate } }),
      KnowledgeBase.countDocuments({ tenantId, isActive: true }),
      KnowledgeBase.countDocuments({ tenantId, status: 'processed', isActive: true })
    ]);
    
    // Avg confidence
    const confResult = await Conversation.aggregate([
      { $match: { tenantId, createdAt: { $gte: startDate }, avgConfidence: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$avgConfidence' } } }
    ]);
    const avgConfidence = confResult[0]?.avg || 0;
    
    // Resolution rate
    const resolutionRate = totalConversations > 0
      ? ((resolvedConversations / totalConversations) * 100).toFixed(1)
      : 0;
    
    const escalationRate = totalConversations > 0
      ? ((escalatedConversations / totalConversations) * 100).toFixed(1)
      : 0;
    
    res.json({
      overview: {
        totalConversations,
        activeConversations,
        resolvedConversations,
        escalatedConversations,
        totalTickets,
        openTickets,
        resolvedTickets,
        totalDocuments,
        processedDocuments,
        avgConfidence: (avgConfidence * 100).toFixed(1),
        resolutionRate,
        escalationRate
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// @route   GET /api/analytics/conversations-over-time
router.get('/conversations-over-time', async (req, res) => {
  try {
    const tenantId = req.tenant._id;
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const data = await Conversation.aggregate([
      { $match: { tenantId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          escalated: { $sum: { $cond: ['$escalated', 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    const formatted = data.map(d => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
      total: d.count,
      resolved: d.resolved,
      escalated: d.escalated
    }));
    
    res.json({ data: formatted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// @route   GET /api/analytics/ticket-stats
router.get('/ticket-stats', async (req, res) => {
  try {
    const tenantId = req.tenant._id;
    
    const byStatus = await Ticket.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const byPriority = await Ticket.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    
    const byCategory = await Ticket.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    res.json({
      byStatus: byStatus.map(s => ({ name: s._id, value: s.count })),
      byPriority: byPriority.map(p => ({ name: p._id, value: p.count })),
      byCategory: byCategory.map(c => ({ name: c._id, value: c.count }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ticket stats' });
  }
});

// @route   GET /api/analytics/recent-activity
router.get('/recent-activity', async (req, res) => {
  try {
    const tenantId = req.tenant._id;
    
    const [recentConversations, recentTickets] = await Promise.all([
      Conversation.find({ tenantId })
        .select('customer status escalated createdAt lastMessageAt totalMessages')
        .sort({ lastMessageAt: -1 })
        .limit(5),
      Ticket.find({ tenantId })
        .select('ticketNumber title status priority customer createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);
    
    res.json({ recentConversations, recentTickets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

module.exports = router;
