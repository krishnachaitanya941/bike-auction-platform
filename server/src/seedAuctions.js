require('./config');
const { pool } = require('./db');

const IMG = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`;

const bikes = [
  { make: 'Royal Enfield', model: 'Classic 350', year: 2022, km: 8420, img: 'photo-1591637333184-19aa84b3e01f', start: 140000, inc: 500, endsInMin: 134, startsInMin: -60 },
  { make: 'KTM', model: 'Duke 390', year: 2023, km: 5180, img: 'photo-1449426468159-d96dbf08f19f', start: 240000, inc: 2000, endsInMin: 45, startsInMin: -90 },
  { make: 'Yamaha', model: 'R15 V4', year: 2022, km: 11240, img: 'photo-1588627541420-fce3f661b779', start: 145000, inc: 1000, endsInMin: 107, startsInMin: -30 },
  { make: 'Bajaj', model: 'Pulsar NS200', year: 2021, km: 16900, img: 'photo-1568772585407-9361f9bf3a87', start: 90000, inc: 500, endsInMin: 322, startsInMin: -15 },
  { make: 'Honda', model: 'CB350', year: 2023, km: 4650, img: 'photo-1558981403-c5f9899a28bc', start: 180000, inc: 1000, endsInMin: 198, startsInMin: -45 },
  { make: 'TVS', model: 'Apache RTR 200', year: 2022, km: 9860, img: 'photo-1609630875171-b1321377ee65', start: 105000, inc: 500, endsInMin: 260, startsInMin: -20 },
  // upcoming
  { make: 'Suzuki', model: 'Gixxer SF 250', year: 2022, km: 7300, img: 'photo-1558981403-c5f9899a28bc', start: 120000, inc: 500, endsInMin: 1800, startsInMin: 1440 },
  { make: 'Kawasaki', model: 'Ninja 300', year: 2021, km: 12100, img: 'photo-1449426468159-d96dbf08f19f', start: 230000, inc: 2000, endsInMin: 2100, startsInMin: 1500 },
  // ended
  { make: 'Hero', model: 'Xpulse 200', year: 2021, km: 15200, img: 'photo-1609630875171-b1321377ee65', start: 85000, inc: 500, endsInMin: -120, startsInMin: -600 },
];

(async () => {
  if (process.argv.includes('--reset')) {
    await pool.query('DELETE FROM bids');
    await pool.query('DELETE FROM auctions');
    await pool.query('DELETE FROM bikes');
    console.log('Cleared bids, auctions and bikes');
  } else {
    const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM auctions');
    if (c > 0) {
      console.log('Auctions already exist. Run with --reset to recreate demo data.');
      await pool.end();
      return;
    }
  }

  for (const b of bikes) {
    const [bike] = await pool.query(
      'INSERT INTO bikes (make, model, year, mileage_km, condition_notes, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [b.make, b.model, b.year, b.km, 'Well maintained with service history. Minor cosmetic wear only.', IMG(b.img)]
    );
    const status = b.endsInMin <= 0 ? 'ended' : b.startsInMin > 0 ? 'scheduled' : 'live';
    await pool.query(
      `INSERT INTO auctions (bike_id, starting_price, min_increment, current_price, status, starts_at, ends_at)
       VALUES (?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))`,
      [bike.insertId, b.start, b.inc, b.start, status, b.startsInMin, b.endsInMin]
    );
  }
  console.log(`Seeded ${bikes.length} bikes and auctions`);
  await pool.end();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});