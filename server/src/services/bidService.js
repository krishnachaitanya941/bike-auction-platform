const { pool } = require('../db');
const { AppError } = require('../errors');

const ANTI_SNIPE_SECONDS = 30;

function shape(row, extra = {}) {
  const price = Number(row.current_price);
  const inc = Number(row.min_increment);
  return {
    auctionId: row.id,
    currentPrice: price,
    minNextBid: row.highest_bidder_id ? price + inc : Number(row.starting_price),
    highestBidderId: row.highest_bidder_id ? Number(row.highest_bidder_id) : null,
    endsAt: row.ends_at,
    status: row.status,
    ...extra,
  };
}

async function placeBid({ auctionId, userId, amount, requestId }) {
  const bidAmount = Math.round(amount * 100) / 100;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock this auction row. Any other bid on the same auction waits here.
    const [rows] = await conn.query(
      `SELECT id, status, starting_price, min_increment, current_price, highest_bidder_id, ends_at,
              (status IN ('scheduled','live')
                 AND starts_at <= UTC_TIMESTAMP()
                 AND ends_at > UTC_TIMESTAMP()) AS is_open
       FROM auctions WHERE id = ? FOR UPDATE`,
      [auctionId]
    );
    const a = rows[0];
    if (!a) throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found.');

    // Retry of a bid we already stored: return the current state, do not bid twice.
    const [dup] = await conn.query(
      'SELECT id FROM bids WHERE user_id = ? AND request_id = ?',
      [userId, requestId]
    );
    if (dup.length) {
      await conn.commit();
      return shape(a, { duplicate: true, bidId: dup[0].id });
    }

    if (!a.is_open) {
      throw new AppError(409, 'AUCTION_NOT_LIVE', 'This auction is not accepting bids.');
    }
    if (Number(a.highest_bidder_id) === userId) {
      throw new AppError(409, 'ALREADY_HIGHEST_BIDDER', 'You are already the highest bidder.');
    }

    const current = Number(a.current_price);
    const minNext = a.highest_bidder_id ? current + Number(a.min_increment) : Number(a.starting_price);
    if (bidAmount < minNext) {
      const err = new AppError(
        422,
        'BID_TOO_LOW',
        `Your bid must be at least ₹${minNext.toLocaleString('en-IN')}.`
      );
      err.details = { minNextBid: minNext };
      throw err;
    }

    const [ins] = await conn.query(
      'INSERT INTO bids (auction_id, user_id, amount, request_id) VALUES (?, ?, ?, ?)',
      [auctionId, userId, bidAmount, requestId]
    );

    await conn.query(
      `UPDATE auctions
       SET current_price = ?, highest_bidder_id = ?, status = 'live', version = version + 1,
           ends_at = IF(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), ends_at) < ?,
                        DATE_ADD(ends_at, INTERVAL ? SECOND), ends_at)
       WHERE id = ?`,
      [bidAmount, userId, ANTI_SNIPE_SECONDS, ANTI_SNIPE_SECONDS, auctionId]
    );

    const [after] = await conn.query('SELECT * FROM auctions WHERE id = ?', [auctionId]);
    await conn.commit();

    const extended = new Date(after[0].ends_at).getTime() > new Date(a.ends_at).getTime();
    return shape(after[0], {
      duplicate: false,
      bidId: ins.insertId,
      extended,
      previousHighestBidderId: a.highest_bidder_id ? Number(a.highest_bidder_id) : null,
    });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      throw new AppError(409, 'DUPLICATE_REQUEST', 'This bid was already submitted.');
    }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { placeBid };