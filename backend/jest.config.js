module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/tests/**/*.test.js'],
  globalSetup: './jest.globalSetup.js',
  setupFiles: ['./jest.setup.js'],
  testTimeout: 30000,
  maxWorkers: 1,
};
