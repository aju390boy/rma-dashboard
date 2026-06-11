const mongoose = require('mongoose');

// Connect before all tests in a suite
beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

// Clean all collections between test files
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Disconnect after all tests in a suite
afterAll(async () => {
  await mongoose.disconnect();
});
