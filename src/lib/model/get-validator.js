const { yupFromTable } = require('automata-db');

const { resourceSchema, userResourceSchema } = require('./validators');

const getValidator = async (table, { validator, userRequired }) => (
  (validator || await yupFromTable(table))
    .concat(userRequired ? userResourceSchema : resourceSchema)
);

module.exports = getValidator;
