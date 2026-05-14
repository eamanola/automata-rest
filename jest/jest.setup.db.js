const { drivers } = require('automata-db');

global.db = drivers({ DB_ENGINE: 'sqlite' });

beforeAll(async () => {
  await global.db.connectDB(':memory:');
});

afterAll(async () => {
  await global.db.closeDB();
});
