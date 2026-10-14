const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { pool } = require('../db');
const config = require('../config');
const { AppError } = require('../errors');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const err = new AppError(422, 'VALIDATION_ERROR', 'Please check the highlighted fields.');
    err.details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw err;
  }
  return result.data;
}

function signToken(user) {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn,
  });
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

// A fixed hash so login takes similar time whether or not the email exists
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

router.post('/register', async (req, res) => {
  const { name, email, password } = parse(registerSchema, req.body);
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [email, passwordHash, name]
    );
    const user = { id: result.insertId, name, email, role: 'user' };
    res.status(201).json({ user: publicUser(user), token: signToken(user) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
    }
    throw err;
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'That email or password does not look right.');
  }
  res.json({ user: publicUser(user), token: signToken(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
  if (!rows[0]) throw new AppError(401, 'INVALID_TOKEN', 'Account no longer exists.');
  res.json({ user: rows[0] });
});

module.exports = router;