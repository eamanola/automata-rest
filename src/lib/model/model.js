const { randomUUID } = require('node:crypto');

const { NODE_ENV } = require('../../config');
const restTable = require('./rest-table');
const getValidator = require('./get-validator');

const restModel = (db, table, { userRequired = true, validator = null } = {}) => {
  const rTable = restTable(table, { userRequired });
  const { name: tableName, columns } = rTable;

  let shape;
  const init = async () => {
    shape = await getValidator(rTable, { userRequired, validator });
    await db.createTable(rTable);
  };
  init();

  const insertOne = async (newRow) => {
    const row = { ...newRow, id: randomUUID(), modified: new Date() };

    await shape.validate(row);

    await db.insertOne(tableName, db.toDB(row));

    return row;
  };

  const findOne = async (where) => (
    db.fromDB(await db.findOne(tableName, db.toDB(where)), columns)
  );

  const find = async (where, options) => (
    await db.find(tableName, db.toDB(where), options) || []
  ).map((row) => db.fromDB(row, columns));

  const replaceOne = async (where, replacement) => {
    if (!where.id) {
      throw new Error('id is required');
    }

    const newRow = { ...replacement, modified: new Date() };
    await shape.validate(newRow);

    return db.replaceOne(tableName, db.toDB(where), db.toDB(newRow));
  };

  const deleteOne = ({ id, ...where }) => !!id
    && db.deleteOne(tableName, db.toDB({ ...where, id }));

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
