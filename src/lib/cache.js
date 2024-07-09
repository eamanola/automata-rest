const { getItem, setItem, removeItem } = require('automata-cache');
const { utils } = require('automata-utils');

const { NODE_ENV } = require('../config');

const { logger } = utils;

const cacheKey = ({ user, url }) => `${user?.email || ''}${url}`;

const onFinish = (req, res, callback) => {
  const old = res.json;

  res.json = (body) => {
    // Accepted pitfall: may lead to unsync, if same request done before cache server updates
    old.call(res, body); // continue request forward

    callback(req, res, body); // do cache in parallel
  };
};

const cacheResult = async ( // req, res, body
  { user, originalUrl },
  { statusCode },
  body,
) => {
  if (statusCode === 200) {
    const key = cacheKey({ url: originalUrl, user });

    try {
      await setItem(key, { body, statusCode });
    } catch (err) {
      logger.info(err);
    }
  }
};

const invalidateCache = async ( // req, res
  { user, originalUrl, baseUrl },
  { statusCode },
) => {
  if (statusCode === 200 || statusCode === 201) {
    try {
      const keys = [cacheKey({ url: originalUrl, user })];
      if (baseUrl !== originalUrl) {
        keys.push(cacheKey({ url: baseUrl, user }));
      }

      await removeItem(keys);
    } catch (err) {
      logger.info(err);
    }
  }
};

const fromCache = async ({ user, originalUrl }) => { // req
  const key = cacheKey({ url: originalUrl, user });
  const cached = await getItem(key);

  return cached;
};

const cache = async (req, res, next) => {
  let error = null;

  try {
    const method = req.method.toUpperCase();

    if (method === 'GET') {
      const cached = await fromCache(req);

      if (cached) {
        res.status(cached.statusCode).json(cached.body);

        logger.info('from cache');
      } else {
        onFinish(req, res, cacheResult);
      }
    } else if (['POST', 'PUT', 'DELETE'].includes(method)) {
      onFinish(req, res, invalidateCache);
    }
  } catch (err) {
    error = err;
  }

  next(error);
};

module.exports = cache;

if (NODE_ENV === 'test') {
  module.exports.cacheKey = cacheKey;
}
