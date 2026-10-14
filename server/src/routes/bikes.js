const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { parse } = require('../validate');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const bikeSchema = z.object({
  make: z.string().trim().min(2).max(80),
  model: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  mileageKm: z.coerce.number().int().min(0).max(500000),
  conditionNotes: z.string().trim().max(2000).optional(),
  imageUrl: z.string().url().max(500).optional(),
});

router.get('/', async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, make, model, year, mileage_km AS mileageKm, image_url AS imageUrl FROM bikes ORDER BY id DESC'
  );
  res.json({ bikes: rows });
});

router.post('/', async (req, res) => {
  const b = parse(bikeSchema, req.body);
  const [result] = await pool.query(
    'INSERT INTO bikes (make, model, year, mileage_km, condition_notes, image_url) VALUES (?, ?, ?, ?, ?, ?)',
    [b.make, b.model, b.year, b.mileageKm, b.conditionNotes ?? null, b.imageUrl ?? null]
  );
  res.status(201).json({ id: result.insertId, ...b });
});

module.exports = router;