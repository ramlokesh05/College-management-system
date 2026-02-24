require('dotenv').config();
const mongoose = require('mongoose');

console.log('\n🔍 Checking MongoDB Connection...\n');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB Connection: SUCCESSFUL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 Host: ${mongoose.connection.host}`);
    console.log(`📁 Database: ${mongoose.connection.name}`);
    console.log(`🔌 Ready State: ${mongoose.connection.readyState} (1=connected)`);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Collections: ${collections.length}`);
    console.log(`📋 Names: ${collections.map(c => c.name).join(', ')}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ MongoDB Connection: FAILED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Error: ${err.message}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  });
