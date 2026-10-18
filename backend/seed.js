require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/pneumonia_detection_db';
async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding');

    // Admin user
    let admin = await User.findOne({ email: 'admin@radiology.local' });
    if (!admin) {
      admin = new User({
        name: 'Lead Radiologist Admin',
        email: 'admin@radiology.local',
        password: 'password123',
        role: 'admin',
        gender: 'Other',
        status: 'active'
      });
      await admin.save();
      console.log('Created admin user: admin@radiology.local / password123');
    } else {
      admin.password = 'password123';
      admin.role = 'admin';
      admin.status = 'active';
      await admin.save();
      console.log('Updated existing admin user: admin@radiology.local / password123');
    }

    // Regular Clinician
    let clinician = await User.findOne({ email: 'clinician@radiology.local' });
    if (!clinician) {
      clinician = new User({
        name: 'Dr. John Doe, MD',
        email: 'clinician@radiology.local',
        password: 'password123',
        role: 'user',
        gender: 'Male',
        status: 'active'
      });
      await clinician.save();
      console.log('Created clinician user: clinician@radiology.local / password123');
    } else {
      clinician.password = 'password123';
      clinician.role = 'user';
      clinician.status = 'active';
      await clinician.save();
      console.log('Updated existing clinician user: clinician@radiology.local / password123');
    }

    console.log('Seeding completed successfully!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
