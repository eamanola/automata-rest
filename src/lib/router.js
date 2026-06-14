const express = require('express');
const { middlewares } = require('automata-utils');

const restCache = require('./cache');
const restController = require('./controller');

const { requireUser } = middlewares;

const restRouter = (controller, {
  cache = null,
  userRequired = true,
  resultKey = 'result',
  resultsKey = 'results',

  db,
  table,
  validator,
} = {}) => {
  const {
    create, byId, byOwner, updateOne, update, remove,
  } = controller || restController(
    null,
    {
      db,
      table,
      userRequired,
      validator,
    },
  );

  const post = async (req, res, next) => {
    let error = null;

    try {
      const { body, user } = req;
      const created = await create(user?.id, body);

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
      const result = await byId(user?.id, { id: params.id });

      let status;
      let message;
      if (result === null) {
        status = 404;
        message = 'NOT FOUND';
      } else {
        status = 200;
        message = 'OK';
      }

      res.status(status).json({ message, [resultKey]: result });
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
      const results = await byOwner(user?.id);

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
      await updateOne(user?.id, body);

      const { id } = params;
      const updated = await byId(user?.id, { id });

      res.status(200).json({ message: 'OK', [resultKey]: updated });
    } catch (err) {
      error = err;
    } finally {
      next(error);
    }
  };

  const putMany = async (req, res, next) => {
    try {
      const { user, body } = req;

      await update(user?.id, body);

      const updates = await Promise.all(body.map(({ id }) => byId(user?.id, { id })));

      res.status(200).json({ message: 'OK', [resultsKey]: updates });
    } catch (err) {
      next(err);
    }
  };

  const deleteHandler = async (req, res, next) => {
    let error = null;

    try {
      const { user, params } = req;
      const { id } = params;
      await remove(user?.id, { id });

      res.status(200).json({ message: 'OK' });
    } catch (err) {
      error = err;
    } finally {
      next(error);
    }
  };

  const router = express.Router();

  if (userRequired) { router.use(requireUser); }

  if (cache) { router.use(restCache({ cache })); }

  router.post('/', post);

  router.get('/:id', getById);

  router.get('/', getByOwner);

  router.put('/:id', put);

  router.put('/', putMany);

  router.delete('/:id', deleteHandler);

  return router;
};

module.exports = restRouter;
