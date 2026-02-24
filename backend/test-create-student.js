require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const StudentProfile = require('./src/models/StudentProfile');
const Fee = require('./src/models/Fee');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    console.log('Testing student creation...\n');
    
    try {
      // Clean up test user if exists
      await User.deleteOne({ email: 'testuser@example.com' });
      
      // Create user
      console.log('Creating user...');
      const user = await User.create({
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password123',
        username: 'testuser123',
        role: 'student',
      });
      console.log('✅ User created:', user._id);
      
      // Create profile
      console.log('Creating profile...');
      const profile = await StudentProfile.create({
        user: user._id,
        rollNumber: 'TEST001',
        department: 'Test Dept',
        year: 1,
        semester: 1,
        section: 'A',
      });
      console.log('✅ Profile created:', profile._id);
      
      // Create fee
      console.log('Creating fee...');
      const fee = await Fee.create({
        student: user._id,
        semester: 1,
        academicYear: '2026-2027',
        totalFee: 50000,
        paidAmount: 0,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });
      console.log('✅ Fee created:', fee._id);
      
      console.log('\n✅✅✅ ALL OPERATIONS SUCCESSFUL! ✅✅✅');
      console.log('Student creation works correctly!\n');
      
      // Clean up
      await User.deleteOne({ _id: user._id });
 await StudentProfile.deleteOne({ _id: profile._id });
      await Fee.deleteOne({ _id: fee._id });
      console.log('Test data cleaned up.');
      
    } catch (error) {
      console.log('\n❌ ERROR:', error.message);
      console.log('Stack:', error.stack);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });
