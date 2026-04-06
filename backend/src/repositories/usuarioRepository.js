/**
 * Repository de Usuários
 * Camada de acesso ao banco para operações com usuários
 */
const { db } = require('../config/database');

const usuarioRepository = {
  /** Busca usuário por email */
  buscarPorEmail(email) {
    return db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  },

  /** Busca usuário por ID (sem senha_hash) */
  buscarPorId(id) {
    return db.prepare('SELECT id, nome, email, role, ativo, criado_em FROM usuarios WHERE id = ?').get(id);
  },

  /** Busca usuário por ID — retorna apenas campos seguros (nunca senha_hash) */
  buscarPorIdSeguro(id) {
    return db.prepare('SELECT id, nome, email, role FROM usuarios WHERE id = ?').get(id);
  },

  /** Cria novo usuário */
  criar({ nome, email, senha_hash, role = 'user' }) {
    const stmt = db.prepare('INSERT INTO usuarios (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)');
    const result = stmt.run(nome, email, senha_hash, role);
    return { id: result.lastInsertRowid, nome, email, role };
  },

  /** Lista todos os usuários (sem senha) */
  listarTodos() {
    return db.prepare('SELECT id, nome, email, role, ativo, criado_em FROM usuarios').all();
  }
};

module.exports = usuarioRepository;
