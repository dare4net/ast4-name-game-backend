/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  moduleDirectories: ['node_modules'],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
