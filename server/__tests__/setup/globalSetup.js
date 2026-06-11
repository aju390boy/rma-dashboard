const { MongoMemoryReplSet } = require('mongodb-memory-server');

module.exports = async () => {
  // Set env vars before anything else
  process.env.NODE_ENV          = 'test';
  process.env.JWT_SECRET        = 'test_jwt_secret_32_chars_minimum_ok';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_ok';
  process.env.JWT_EXPIRES_IN    = '1h';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  const replset = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await replset.waitUntilRunning();
  process.env.MONGO_URI = replset.getUri('rma_test');
  global.__MONGOD = replset;
};
