require('dotenv').config();
const { Pool, types } = require('pg');

// Parsear campos DATE de PostgreSQL (OID 1082) como strings directos 'YYYY-MM-DD'
// para evitar que el driver pg cree un objeto Date en UTC y cause desfase de 1 día
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'tienda_laptops',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Error Inesperado]:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
