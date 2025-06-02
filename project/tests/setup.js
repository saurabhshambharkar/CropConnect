const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.test' });

// Global setup before all tests
beforeAll(async () => {
  // Connect to a test database
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cropconnect_test', {});
  console.log('Connected to test database');
});

// Global teardown after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.close();
  console.log('Database connection closed');
});