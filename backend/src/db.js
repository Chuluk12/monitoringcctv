const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || (() => {
  const { POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD } = process.env;
  if (!POSTGRES_DB || !POSTGRES_USER || !POSTGRES_PASSWORD) return undefined;
  return `postgresql://${encodeURIComponent(POSTGRES_USER)}:${encodeURIComponent(POSTGRES_PASSWORD)}@localhost:5432/${encodeURIComponent(POSTGRES_DB)}`;
})();

const pool = new Pool({ connectionString: databaseUrl });

pool.on('error', (err) => {
  console.error('[db] unexpected pool error', err);
});

module.exports = { pool };
