jest.mock('../src/config', () => {
  const actual = jest.requireActual('../src/config');

  return { ...actual };
});
