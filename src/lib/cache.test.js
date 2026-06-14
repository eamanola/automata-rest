const supertest = require('supertest');
const express = require('express');
const {
  closeCache, connectCache, getItem, removeItem, setItem,
} = require('automata-cache');

const restCache = require('./cache');
const { cacheKey } = require('./cache');

const SUCCESS = { message: 'ok' };

let cache;
let api;

describe('cache middleware', () => {
  beforeAll(async () => {
    cache = await connectCache('use-mock');

    const router = express.Router();
    router.use(restCache({ cache }));
    router.use((req, res, next) => {
      if (req.get('fail')) {
        res.status(400).json({});
      } else {
        next();
      }
    });

    router.get('/:id', (req, res) => { res.status(200).json(SUCCESS); });
    router.get('/', (req, res) => { res.status(200).json(SUCCESS); });
    router.post('/', (req, res) => { res.status(201).json(SUCCESS); });
    router.put('/:id', (req, res) => { res.status(200).json(SUCCESS); });
    router.delete('/:id', (req, res) => { res.status(200).json(SUCCESS); });

    const app = express();
    app.use('/test', router);
    api = supertest(app);
  });

  afterAll(async () => {
    await closeCache(cache);
  });

  afterEach(async () => {
    await removeItem(cache, '/test');
    await removeItem(cache, '/test/id');
  });

  describe('GET /:id', () => {
    it('should cache the results', async () => {
      const key = cacheKey({ url: '/test/id' });

      expect(await getItem(cache, key)).toBeFalsy();

      const { body } = await api.get('/test/id');

      expect((await getItem(cache, key)).body).toEqual(body);
    });

    it('should not cache, if fail', async () => {
      const key = cacheKey({ url: '/test/id' });

      expect(await getItem(cache, key)).toBeFalsy();

      await api.get('/test/id').set({ fail: 1 });

      expect(await getItem(cache, key)).toBeFalsy();
    });

    it('should use a cached value, if available', async () => {
      const key = cacheKey({ url: '/test/id' });

      const cached = { body: 'foo', statusCode: 234 };

      await setItem(cache, key, cached);
      expect(await getItem(cache, key)).toEqual(cached);

      const { body, statusCode } = await api.get('/test/id');

      expect(body).toEqual(cached.body);
      expect(statusCode).toEqual(cached.statusCode);
    });
  });

  describe('GET /', () => {
    it('should cache the results', async () => {
      const key = cacheKey({ url: '/test' });

      expect(await getItem(cache, key)).toBeFalsy();

      const { body } = await api.get('/test');

      expect((await getItem(cache, key)).body).toEqual(body);
    });

    it('should not cache, if fail', async () => {
      const key = cacheKey({ url: '/test' });

      expect(await getItem(cache, key)).toBeFalsy();

      await api.get('/test').set({ fail: 1 });

      expect(await getItem(cache, key)).toBeFalsy();
    });

    it('should use a cached value, if available', async () => {
      const key = cacheKey({ url: '/test' });

      const cached = { body: 'foo', statusCode: 234 };

      await setItem(cache, key, cached);
      expect(await getItem(cache, key)).toEqual(cached);

      const { body, statusCode } = await api.get('/test');

      expect(body).toEqual(cached.body);
      expect(statusCode).toEqual(cached.statusCode);
    });
  });

  describe('POST /', () => {
    it('should clear / cache', async () => {
      const key = cacheKey({ url: '/test' });

      await setItem(cache, key, 'foo');
      expect(await getItem(cache, key)).toBe('foo');

      await api.post('/test');

      expect(await getItem(cache, key)).toBeFalsy();
    });

    it('should not clear / cache, if fail', async () => {
      const key = cacheKey({ url: '/test' });

      await setItem(cache, key, 'foo');
      expect(await getItem(cache, key)).toBe('foo');

      await api.post('/test').set({ fail: 1 });

      expect(await getItem(cache, key)).toBe('foo');
    });
  });

  describe('PUT /:id', () => {
    it('should clear / cache & /:id cache', async () => {
      const key1 = cacheKey({ url: '/test' });
      const key2 = cacheKey({ url: '/test/id' });

      await setItem(cache, key1, 'foo1');
      await setItem(cache, key2, 'foo2');
      expect(await getItem(cache, key1)).toBe('foo1');
      expect(await getItem(cache, key2)).toBe('foo2');

      await api.put('/test/id');

      expect(await getItem(cache, key1)).toBeFalsy();
      expect(await getItem(cache, key2)).toBeFalsy();
    });

    it('should not clear / cache & /:id cache, if fail', async () => {
      const key1 = cacheKey({ url: '/test' });
      const key2 = cacheKey({ url: '/test/id' });

      await setItem(cache, key1, 'foo1');
      await setItem(cache, key2, 'foo2');
      expect(await getItem(cache, key1)).toBe('foo1');
      expect(await getItem(cache, key2)).toBe('foo2');

      await api.put('/test/id').set({ fail: 1 });

      expect(await getItem(cache, key1)).toBe('foo1');
      expect(await getItem(cache, key2)).toBe('foo2');
    });
  });

  describe('DELETE /:id', () => {
    it('should clear / cache & /:id cache', async () => {
      const key1 = cacheKey({ url: '/test' });
      const key2 = cacheKey({ url: '/test/id' });

      await setItem(cache, key1, 'foo1');
      await setItem(cache, key2, 'foo2');
      expect(await getItem(cache, key1)).toBe('foo1');
      expect(await getItem(cache, key2)).toBe('foo2');

      await api.delete('/test/id');

      expect(await getItem(cache, key1)).toBeFalsy();
      expect(await getItem(cache, key2)).toBeFalsy();
    });

    it('should not clear / cache & /:id cache, if fail', async () => {
      const key1 = cacheKey({ url: '/test' });
      const key2 = cacheKey({ url: '/test/id' });

      await setItem(cache, key1, 'foo1');
      await setItem(cache, key2, 'foo2');
      expect(await getItem(cache, key1)).toBe('foo1');
      expect(await getItem(cache, key2)).toBe('foo2');

      await api.delete('/test/id').set({ fail: 1 });

      expect(await getItem(cache, key1)).toBe('foo1');
      expect(await getItem(cache, key2)).toBe('foo2');
    });
  });
});
