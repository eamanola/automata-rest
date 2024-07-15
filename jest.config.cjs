module.exports = {
  setupFiles: [
    './jest/jest.mock.cache.js',
  ],
  setupFilesAfterEnv: [
    './jest/jest.setup.db.js',
    './jest/jest.setup.cache.js',
  ],
};
