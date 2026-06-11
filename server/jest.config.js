/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  globalSetup:    './__tests__/setup/globalSetup.js',
  globalTeardown: './__tests__/setup/globalTeardown.js',
  setupFiles:     ['./__tests__/setup/setupEnv.js'],   // runs in every worker
  testTimeout: 60000,  // Generous timeout — replica set + transactions are slow
  testMatch: [
    '**/__tests__/**/*.test.js',
  ],
  // Don't re-use connections across test files
  maxWorkers: 1,
  // Coverage collection
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  // Verbose output
  verbose: true,
};
