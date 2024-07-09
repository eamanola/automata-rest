const { randomUUID } = require('node:crypto');

const {
  createTable: dbCreateTable,
  deleteOne: dbDeleteOne,
  find: dbFind,
  findOne: dbFindOne,
  fromDB,
  insertOne: dbInsertOne,
  replaceOne: dbReplaceOne,
  toDB,
} = require('automata-db');

const { NODE_ENV } = require('../../config');

const restTable = require('./rest-table');
const getValidator = require('./get-validator');

const restModel = (table, { userRequired = true, validator = null } = {}) => {
  const rTable = restTable(table, { userRequired });
  const { name: tableName, columns } = rTable;

  let shape;
  const init = async () => {
    shape = await getValidator(rTable, { userRequired, validator });
    await dbCreateTable(rTable);
  };
  init();

  const insertOne = async (newRow) => {
    const row = { ...newRow, id: randomUUID(), modified: new Date() };

    await shape.validate(row);

    await dbInsertOne(tableName, toDB(row));

    return row;
  };

  const findOne = async (where) => fromDB(await dbFindOne(tableName, toDB(where)), columns);

  const find = async (where, options) => (await dbFind(tableName, toDB(where), options) || [])
    .map((row) => fromDB(row, columns));

  const replaceOne = async (where, replacement) => {
    if (!where.id) {
      throw new Error('id is required');
    }

    const newRow = { ...replacement, modified: new Date() };
    await shape.validate(newRow);

    return dbReplaceOne(tableName, toDB(where), toDB(newRow));
  };

  const deleteOne = ({ id, ...where }) => !!id && dbDeleteOne(tableName, toDB({ ...where, id }));

  return {
    deleteOne,
    find,
    findOne,
    init: NODE_ENV === 'test' ? init : undefined,
    insertOne,
    replaceOne,
  };
};

module.exports = restModel;
