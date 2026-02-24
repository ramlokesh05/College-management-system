require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Updating admin user...\n');
    
    const admin = await User.findOne({role: 'admin'});
    
    if (!admin) {
      console.log('❌ No admin user found!');
      process.exit(1);
    }
    
    // Update using direct query to avoid hooks
    await User.updateOne(
      { _id: admin._id },
      { $set: { name: 'System Admin' } }
    );
    
    const updatedAdmin = await User.findOne({role: 'admin'})
      .select('username email name role');
    
    console.log('✅ Admin user updated successfully!\n');
    console.log('📋 Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Name:', updatedAdmin.name);
    console.log('Username:', updatedAdmin.username);
    console.log('Email:', updatedAdmin.email);
    console.log('Role:', updatedAdmin.role);
    console.log('Password: 12345');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ Error:', err.message);
    process.exit(1);
  });
