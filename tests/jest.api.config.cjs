module.exports = {
  displayName: 'api',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/api/**/*.test.js'],
  transform: {},
  setupFilesAfterEnv: ['<rootDir>/helpers/adminLocation.js'],
  testTimeout: 15000,
  coverageDirectory: '<rootDir>/../coverage/api',
};
