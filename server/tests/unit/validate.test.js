const { z } = require('zod');
const { parse, parseId } = require('../../src/validate');

describe('request validation helpers', () => {
  it('parses positive integer route ids', () => {
    expect(parseId('42')).toBe(42);
  });

  it.each(['0', '-1', 'not-a-number'])('rejects invalid route id %s with a client error', (id) => {
    try {
      parseId(id);
      throw new Error('Expected parseId to reject the input.');
    } catch (error) {
      expect(error.status).toBe(400);
      expect(error.code).toBe('BAD_ID');
    }
  });

  it('returns structured field details for invalid request data', () => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

    try {
      parse(schema, { email: 'invalid', password: 'short' });
      throw new Error('Expected parse to reject the input.');
    } catch (error) {
      expect(error.status).toBe(422);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details.map((detail) => detail.field)).toEqual(['email', 'password']);
    }
  });
});
