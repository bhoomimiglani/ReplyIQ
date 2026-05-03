require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');
const Tenant = require('../models/Tenant');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/supportai');
  
  console.log('Seeding database...');
  
  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@supportai.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = new User({
      name: 'Super Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      organization: 'SupportAI',
      isActive: true
    });
    await admin.save();
    console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log('Admin already exists');
  }
  
  // Create demo business user + tenant
  const demoEmail = 'demo@acme.com';
  let demoUser = await User.findOne({ email: demoEmail });
  
  if (!demoUser) {
    // Create user first
    demoUser = new User({
      name: 'Demo User',
      email: demoEmail,
      password: 'Demo@123456',
      role: 'business',
      organization: 'Acme Corp',
      isActive: true
    });
    await demoUser.save();

    // Now create tenant with the user as owner
    const tenant = new Tenant({
      name: 'Acme Corp',
      owner: demoUser._id,
      plan: 'pro',
      apiKey: uuidv4().replace(/-/g, ''),
      settings: {
        botName: 'Acme Support Bot',
        welcomeMessage: "Hi! I'm the Acme support assistant. How can I help you today?",
        tone: 'friendly',
        primaryColor: '#6366f1'
      }
    });
    await tenant.save();

    // Link tenant back to user
    demoUser.tenantId = tenant._id;
    await demoUser.save();
    
    console.log(`Demo user created: ${demoEmail} / Demo@123456`);
    console.log(`Demo tenant API key: ${tenant.apiKey}`);
  } else {
    console.log('Demo user already exists');
  }
  
  console.log('Seeding complete!');
  process.exit(0);
};

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
