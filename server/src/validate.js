const { z } = require('zod');
const { AppError } = require('./errors');

function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const err = new AppError(422, 'VALIDATION_ERROR', 'Please check the highlighted fields.');
    err.details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw err;
  }
  return result.data;
}

const idParam = z.coerce.number().int().positive();

function parseId(value) {
  const r = idParam.safeParse(value);
  if (!r.success) throw new AppError(400, 'BAD_ID', 'Invalid id.');
  return r.data;
}

module.exports = { parse, parseId };    