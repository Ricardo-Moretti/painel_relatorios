/**
 * Testa a conexao com o banco MySQL painel_rotinas
 * Rode com: node testar-mysql.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'painel_rotinas',
};

async function testar() {
  console.log('\n=== TESTE DE CONEXAO MySQL ===');
  console.log(`Host:     ${config.host}:${config.port}`);
  console.log(`Banco:    ${config.database}`);
  console.log(`Usuario:  ${config.user}`);
  console.log('==============================\n');

  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('✓ Conexao estabelecida com sucesso!\n');

    const [rows] = await conn.query(`
      SELECT tabela, registros FROM (
        SELECT 'usuarios'         AS tabela, COUNT(*) AS registros FROM usuarios
        UNION ALL SELECT 'rotinas',          COUNT(*) FROM rotinas
        UNION ALL SELECT 'execucoes',        COUNT(*) FROM execucoes
        UNION ALL SELECT 'indicadores_glpi', COUNT(*) FROM indicadores_glpi
        UNION ALL SELECT 'importacoes',      COUNT(*) FROM importacoes
      ) t
    `);

    console.log('Tabelas encontradas:');
    rows.forEach(r => console.log(`  ${r.tabela.padEnd(20)} ${r.registros} registros`));
    console.log('\n✓ Tudo OK! Banco pronto para uso.\n');

  } catch (err) {
    console.error('✗ Falha na conexao:', err.message);
    console.error('\nVerifique no .env:');
    console.error('  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME\n');
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

testar();
