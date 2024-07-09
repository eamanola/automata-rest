const getColumns = ({ columns: baseColumns }, userRequired) => {
  const columns = [
    ...baseColumns,
    {
      name: 'id', required: true, type: 'string', unique: true,
    },
    { name: 'modified', required: true, type: 'date' },
  ];
  if (userRequired) columns.push({ name: 'owner', required: true, type: 'string' });

  return columns;
};

const getIndexes = ({ indexes: baseIndexes = [], name: tableName }, userRequired) => {
  const indexes = [
    ...baseIndexes,
    { columns: ['id'], name: `idx-${tableName}-id`, unique: true },
  ];
  if (userRequired) {
    indexes.push({ columns: ['owner'], name: `idx-${tableName}-owner` });
    indexes.push({ columns: ['id', 'owner'], name: `idx-${tableName}-id-owner`, unique: true });
  }

  return indexes;
};

const restTable = (table, { userRequired }) => {
  const reserved = ['id', 'owner', 'modified'];
  if (table.columns.some(({ name }) => reserved.includes(name))) {
    throw Error(`${reserved.join(', ')} are reserved column names`);
  }

  const columns = getColumns(table, userRequired);
  const indexes = getIndexes(table, userRequired);
  const { name } = table;

  return { columns, indexes, name };
};

module.exports = restTable;
