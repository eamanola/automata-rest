const { string, object, date } = require('yup');

const resourceSchema = object({
  id: string().required(),
  modified: date().required(),
}).noUnknown().strict();

const userResourceSchema = object({
  owner: string().required(),
}).noUnknown().strict().concat(resourceSchema);

module.exports = {
  resourceSchema,
  userResourceSchema,
};
