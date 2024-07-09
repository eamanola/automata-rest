const { deleteAll } = require('automata-db');
const { model, controllers } = require('automata-user-management');

const { findOne, tableName: usersTable } = model;
const { create, authenticate } = controllers;

const findUser = async (where) => findOne(where);

const createUser = async ({ email = 'foo@example.com', password = '123' } = {}) => {
  await create({ email, password });

  return findUser({ email });
};

const deleteUsers = () => deleteAll(usersTable);

const getToken = async ({ email = 'foo@example.com', password = '123' } = {}) => {
  const user = await createUser({ email, password });
  const { token } = await authenticate({ email, password });
  return { token, user };
};

it('should', () => expect(true).toBe(true));

module.exports = {
  createUser,
  deleteUsers,
  findUser,
  getToken,
};
