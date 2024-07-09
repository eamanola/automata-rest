const { REDIS_URL } = require('../src/config');

if (REDIS_URL === 'use-mock') {
  jest.mock('automata-cache', () => {
    const cache = {};

    const setItem = async (key, value) => {
      cache[key] = value;
    };

    const getItem = async (key) => cache[key];

    const removeItem = async (key) => {
      if (typeof key === 'string') {
        delete cache[key];
      } else if (Array.isArray(key)) {
        key.forEach((k) => removeItem(k));
      }
    };

    return {
      closeCache: () => null,
      connectCache: () => null,
      getItem,
      initCache: () => null,
      removeItem,
      setItem,
    };
  });
}
