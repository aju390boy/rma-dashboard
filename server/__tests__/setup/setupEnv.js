/**
 * setupEnv.js — runs inside each Jest worker process BEFORE any test file.
 * Sets env vars that must be available to the test code itself.
 */
process.env.NODE_ENV             = 'test';
process.env.JWT_SECRET           = 'test_jwt_secret_32_chars_minimum_ok';
process.env.JWT_REFRESH_SECRET   = 'test_refresh_secret_32_chars_ok';
process.env.JWT_EXPIRES_IN       = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
// MONGO_URI is set by globalSetup (which runs in the main process)
// and inherited by workers automatically via process.env
