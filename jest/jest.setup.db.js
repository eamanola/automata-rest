global.db = require('automata-db')('sqlite');

beforeAll(async () => {
  await global.db.connectDB(':memory:');
});

afterAll(async () => {
  await global.db.closeDB();
});
