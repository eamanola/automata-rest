const { utils } = require('automata-utils');

const { NODE_ENV } = require('../config');

const { logger } = utils;

const cacheKey = ({ user, url }) => `${user?.email || ''}${url}`;

const onFinish = (req, res, callback) => {
  const old = res.json;

  res.json = (body) => {
    // Accepted pitfall: may lead to unsync, if same request done before cache server updates
    // continue request forward
    old.call(res, body);

    // do cache in parallel
    callback(req, res, body);
  };
};

const cacheResult = (cache) => async (
  { user, originalUrl }, /* req */
  { statusCode }, /* res */
  body, /* body */
) => {
  if (statusCode === 200) {
    const key = cacheKey({ url: originalUrl, user });

    try {
      await cache.setItem(key, { body, statusCode });
    } catch (err) {
      logger.info(err);
    }
  }
};

const invalidateCache = (cache) => async (
  { user, originalUrl, baseUrl }, /* req */
  { statusCode }, /* res */
) => {
  if (statusCode === 200 || statusCode === 201) {
    try {
      const keys = [cacheKey({ url: originalUrl, user })];
      if (baseUrl !== originalUrl) {
        keys.push(cacheKey({ url: baseUrl, user }));
      }

      await cache.removeItem(keys);
    } catch (err) {
      logger.info(err);
    }
  }
};

const fromCache = (cache) => async ({ user, originalUrl }) => { /* req */
  const key = cacheKey({ url: originalUrl, user });
  const cached = await cache.getItem(key);

  return cached;
};

const restCache = ({ cache }) => async (req, res, next) => {
  let error = null;

  try {
    const method = req.method.toUpperCase();

    if (method === 'GET') {
      const cached = await fromCache(cache)(req);

      if (cached) {
        res.status(cached.statusCode).json(cached.body);

        logger.info('from cache');
      } else {
        onFinish(req, res, cacheResult(cache));
      }
    } else if (
      [
        'POST',
        'PUT',
        'DELETE',
      ].includes(method)) {
      onFinish(req, res, invalidateCache(cache));
    }
  } catch (err) {
    error = err;
  }

  next(error);
};

module.exports = restCache;

if (NODE_ENV === 'test') {
  module.exports.cacheKey = cacheKey;
}
