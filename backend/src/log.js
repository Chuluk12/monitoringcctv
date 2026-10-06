const { pool } = require('./db');

async function log(action, { userId = null, username = null, detail = null } = {}) {
  try {
    await pool.query(
      'INSERT INTO activity_logs(user_id, username, action, detail) VALUES ($1,$2,$3,$4)',
      [userId, username, action, detail]
    );
  } catch (err) {
    // Logging must never break the request that triggered it.
    console.error('[log] failed to write activity log', err.message);
  }
}

module.exports = { log };
