module.exports = {
  displayName: 'unit',
  testEnvironment: 'node',
  maxWorkers: 2,
  testMatch: ['<rootDir>/unit/**/*.test.js'],
  transform: {},
  collectCoverageFrom: [
    '<rootDir>/../backend/src/utils/session.util.js',
    '<rootDir>/../backend/src/validators/auth.validator.js',
    '<rootDir>/../frontend/src/utils/tokenStorage.js',
    '<rootDir>/helpers/frontendRouteInventory.js',
  ],
  coverageDirectory: '<rootDir>/../coverage/unit',
};
