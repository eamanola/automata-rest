const { utils, errors } = require('automata-utils');

const { createParamError } = errors;

const { logger } = utils;

const restModel = require('./model');

const restController = (
  model,
  { table, userRequired = true, validator } = {},
) => {
  const {
    deleteOne, findOne, find, insertOne, replaceOne,
  } = model || restModel(table, { userRequired, validator });

  const addOwner = (userId, obj) => {
    if (userRequired) {
      if (!userId) { throw Error('Owner is required'); }

      return { ...obj, owner: userId };
    }

    return { ...obj };
  };

  const removeOwner = (obj) => {
    if (!obj) return obj;

    const { owner, ...rest } = obj;
    return rest;
  };

  const byId = async (userId, { id }) => removeOwner(await findOne(addOwner(userId, { id })));

  const create = async (userId, newResource) => {
    try {
      const row = await insertOne(addOwner(userId, newResource));

      return removeOwner(row);
    } catch (err) {
      if (err.name === 'ValidationError') {
        logger.info(err.message);
        throw createParamError(err);
      }

      throw err;
    }
  };

  const byOwner = async (userId) => (await find(addOwner(userId, {})) || []).map(removeOwner);

  const update = async (userId, resource) => {
    try {
      await replaceOne(addOwner(userId, { id: resource.id }), addOwner(userId, resource));
    } catch (err) {
      if (err.name === 'ValidationError') {
        logger.info(err.message);
        throw createParamError(err);
      }

      throw err;
    }
  };

  const remove = async (userId, { id }) => deleteOne(addOwner(userId, { id }));

  return {
    byId, byOwner, create, remove, update,
  };
};

module.exports = restController;
