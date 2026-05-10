const { connectDB, closeDB } = require('automata-db');

beforeAll(async () => {
  global.client = await connectDB(':memory:');
});

afterAll(async () => {
  await closeDB(global.client);
});
