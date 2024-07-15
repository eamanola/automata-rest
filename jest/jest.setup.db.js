const { initDB, connectDB, closeDB } = require('automata-db');

beforeAll(async () => {
  await initDB(':memory:');
  await connectDB();
});

afterAll(async () => {
  await closeDB();
});
