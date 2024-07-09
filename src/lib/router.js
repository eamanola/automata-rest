const express = require('express');
const { middlewares } = require('automata-utils');

const restCache = require('./cache');
const restController = require('./controller');

const { requireUser } = middlewares;

const restRouter = (controller, {
  useCache = true,
  userRequired = true,
  resultKey = 'result',
  resultsKey = 'results',

  table,
  validator,
} = {}) => {
  const {
    create, byId, byOwner, update, remove,
  } = controller || restController(null, { table, userRequired, validator });

  const post = async (req, res, next) => {
    let error = null;

    try {
      const { body, user } = req;
      const created = await create(user.id, body);

      res.status(201).json({ message: 'CREATED', [resultKey]: created });
    } catch (err) {
      error = err;
    } finally {
      next(error);
    }
  };

  const getById = async (req, res, next) => {
    let error = null;

    try {
      const { params, user } = req;
      const result = await byId(user.id, { id: params.id });

      res.status(200).json({ message: 'OK', [resultKey]: result });
    } catch (err) {
      error = err;
    } finally {
      next(error);
    }
  };

  const getByOwner = async (req, res, next) => {
    let error = null;

    try {
      const { user } = req;
      const results = await byOwner(user.id);

      res.status(200).json({ message: 'OK', [resultsKey]: results });
    } catch (err) {
      error = err;
    } finally {
      next(error);
    }
  };

  const put = async (req, res, next) => {
    let error = null;

    try {
      const { user, body, params } = req;
      await update(user.id, body);

      const { id } = params;
      const updated = await byId(user.id, { id });

      res.status(200).json({ message: 'OK', [resultKey]: updated });
    } catch (err) {
      error = err;
    } finally {
      next(error);
    }
  };

  const deleteHandler = async (req, res, next) => {
    let error = null;

    try {
      const { user, params } = req;
      const { id } = params;
      await remove(user.id, { id });

      res.status(200).json({ message: 'OK' });
    } catch (err) {
      error = err;
    } finally {
      next(error);
    }
  };

  const router = express.Router();

  if (userRequired) { router.use(requireUser); }

  if (useCache) { router.use(restCache); }

  router.post('/', post);

  router.get('/:id', getById);

  router.get('/', getByOwner);

  router.put('/:id', put);

  router.delete('/:id', deleteHandler);

  return router;
};

module.exports = restRouter;
