jest.mock('../src/config', () => {
  const actual = jest.requireActual('../src/config');

  return { REDIS_URL: 'use-mock', ...actual };
});
