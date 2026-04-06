/**
 * Seed — Cria usuario admin e todas as rotinas monitoradas
 */
const { pool, inicializarBanco } = require('./database');
const bcrypt = require('bcryptjs');

async function run() {
  await inicializarBanco();

  // Usuario admin
  const senhaHash = await bcrypt.hash('admin123', 10);
  await pool.execute(
    'INSERT IGNORE INTO usuarios (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)',
    ['Administrador', 'admin@painel.com', senhaHash, 'admin']
  );

  // Todas as rotinas monitoradas
  const rotinas = [
    ['DPM', 'Diária'],
    ['PMM', 'Diária'],
    ['Garantia', 'Diária'],
    ['JDPrisma (Transferencia)', 'Diária'],
    ['CGPool', 'Diária'],
    ['Elipse', 'Diária'],
    ['ShopDeere (Delta)', 'Diária'],
    ['Loja autonoma', 'Diária'],
    ['GLPI', 'Diária'],
  ];

  for (const [nome, freq] of rotinas) {
    await pool.execute(
      'INSERT IGNORE INTO rotinas (nome, frequencia) VALUES (?, ?)',
      [nome, freq]
    );
  }

  console.log('Seed executado — ' + rotinas.length + ' rotinas');
  console.log('Login: admin@painel.com / admin123');

  await pool.end();
}

run().catch(err => {
  console.error('Seed falhou:', err.message);
  process.exit(1);
});
