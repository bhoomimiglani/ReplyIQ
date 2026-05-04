const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const logger = require('../utils/logger');

/**
 * Protect routes - require valid JWT
 */
const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }
    
    req.user = user;
    
    // Load tenant if user has one
    if (user.tenantId) {
      const tenant = await Tenant.findById(user.tenantId);
      if (tenant && tenant.isActive) {
        req.tenant = tenant;
      } else {
        // Tenant missing - auto create
        const { v4: uuidv4 } = require('uuid');
        const newTenant = new Tenant({
          name: user.organization || 'My Organization',
          owner: user._id,
          apiKey: uuidv4().replace(/-/g, '')
        });
        await newTenant.save();
        user.tenantId = newTenant._id;
        await user.save({ validateBeforeSave: false });
        req.tenant = newTenant;
      }
    } else {
      // No tenantId at all - auto create tenant
      const { v4: uuidv4 } = require('uuid');
      const newTenant = new Tenant({
        name: user.organization || user.name + ' Org',
        owner: user._id,
        apiKey: uuidv4().replace(/-/g, '')
      });
      await newTenant.save();
      user.tenantId = newTenant._id;
      await user.save({ validateBeforeSave: false });
      req.tenant = newTenant;
      logger.info(`Auto-created tenant for user ${user._id}`);
    }
    
    next();
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Not authorized, invalid token' });
  }
};

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Require business or admin role
 */
const requireBusiness = (req, res, next) => {
  if (!req.user || !['admin', 'business', 'agent'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Business account required' });
  }
  next();
};

/**
 * Widget API key authentication (for embedded chat widget)
 */
const widgetAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  try {
    const tenant = await Tenant.findOne({ apiKey, isActive: true });
    if (!tenant) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    req.tenant = tenant;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

module.exports = { protect, requireAdmin, requireBusiness, widgetAuth, generateToken };
