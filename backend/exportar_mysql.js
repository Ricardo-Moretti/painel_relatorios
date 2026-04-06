const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'database.sqlite'));

const usuarios  = db.prepare('SELECT * FROM usuarios').all();
const rotinas   = db.prepare('SELECT * FROM rotinas').all();
const execucoes = db.prepare('SELECT * FROM execucoes').all();
const glpi      = db.prepare('SELECT * FROM indicadores_glpi').all();
const imports   = db.prepare('SELECT * FROM importacoes').all();

const esc = (v) => v == null ? 'NULL' : "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

let sql = 'USE painel_rotinas;\n\n';

// usuarios
sql += '-- USUARIOS\n';
usuarios.forEach(r => {
  sql += `INSERT IGNORE INTO usuarios (id,nome,email,senha_hash,role,ativo,token_invalidated_at,criado_em,atualizado_em) VALUES (${r.id},${esc(r.nome)},${esc(r.email)},${esc(r.senha_hash)},${esc(r.role)},${r.ativo},${esc(r.token_invalidated_at)},${esc(r.criado_em)},${esc(r.atualizado_em)});\n`;
});

// rotinas
sql += '\n-- ROTINAS\n';
rotinas.forEach(r => {
  sql += `INSERT IGNORE INTO rotinas (id,nome,frequencia,ativa,criado_em) VALUES (${r.id},${esc(r.nome)},${esc(r.frequencia)},${r.ativa},${esc(r.criado_em)});\n`;
});

// execucoes
sql += '\n-- EXECUCOES\n';
execucoes.forEach(r => {
  sql += `INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (${r.id},${r.rotina_id},${esc(r.data_execucao)},${esc(r.status)},${esc(r.detalhes)},${esc(r.origem_arquivo)},${esc(r.data_importacao)});\n`;
});

// indicadores_glpi
sql += '\n-- INDICADORES GLPI\n';
glpi.forEach(r => {
  sql += `INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (${r.id},${esc(r.data)},${r.quantidade},${esc(r.criado_em)});\n`;
});

// importacoes
sql += '\n-- IMPORTACOES\n';
imports.forEach(r => {
  sql += `INSERT IGNORE INTO importacoes (id,nome_arquivo,data_importacao,registros_inseridos,registros_ignorados,usuario_id) VALUES (${r.id},${esc(r.nome_arquivo)},${esc(r.data_importacao)},${r.registros_inseridos},${r.registros_ignorados},${r.usuario_id == null ? 'NULL' : r.usuario_id});\n`;
});

const outFile = path.join(__dirname, 'export_para_mysql.sql');
fs.writeFileSync(outFile, sql, 'utf8');

console.log('✓ Exportado com sucesso!');
console.log('  Arquivo:', outFile);
console.log('  Usuarios:', usuarios.length);
console.log('  Rotinas:', rotinas.length);
console.log('  Execucoes:', execucoes.length);
console.log('  GLPI:', glpi.length);
console.log('  Importacoes:', imports.length);

db.close();
