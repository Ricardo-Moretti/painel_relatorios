/**
 * Seed — Cria usuario admin e todas as rotinas monitoradas
 */
const { db, inicializarBanco } = require('./database');
const bcrypt = require('bcryptjs');

inicializarBanco();

// Usuario admin
const senhaHash = bcrypt.hashSync('admin123', 10);
db.prepare(`
  INSERT OR IGNORE INTO usuarios (nome, email, senha_hash, role)
  VALUES (?, ?, ?, ?)
`).run('Administrador', 'admin@painel.com', senhaHash, 'admin');

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

const insertRotina = db.prepare(`
  INSERT OR IGNORE INTO rotinas (nome, frequencia) VALUES (?, ?)
`);
rotinas.forEach(([nome, freq]) => insertRotina.run(nome, freq));

console.log('Seed executado — ' + rotinas.length + ' rotinas');
console.log('Login: admin@painel.com / admin123');

db.close();
