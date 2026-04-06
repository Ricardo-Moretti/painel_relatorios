/**
 * Configuracao do banco de dados MySQL
 * Utiliza mysql2/promise com connection pool
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'painel_rotinas',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

async function inicializarBanco() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log('Banco de dados MySQL conectado com sucesso');
  } catch (err) {
    console.error('Erro ao conectar banco MySQL:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, inicializarBanco };
