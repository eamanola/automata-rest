module.exports = {
  setupFiles: [
    './jest/jest.setup.config.js',
    './jest/jest.setup.redis.js',
  ],
  setupFilesAfterEnv: [
    './jest/jest.setup.db.js',
    './jest/jest.setup.cache.js',
  ],
};
