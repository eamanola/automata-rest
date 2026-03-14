require('dotenv').config({ quiet: true });

const { NODE_ENV } = process.env;

module.exports = { NODE_ENV };
