require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./Models/passengerSchema'); 
const logger = require('./logger');
const { URI } = process.env;

mongoose.connect(URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(error => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

const [name, password, email] = process.argv.slice(2); 

if (!name || !password || !email) {
    logger.error('Please provide username, password, and email as arguments.');
    process.exit(1);
}

const createAdmin = async () => {
  try {
   

    const admin = new User({ name, password, email, role: 'admin' }); 
    await admin.save();
    logger.info('Admin user created successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
