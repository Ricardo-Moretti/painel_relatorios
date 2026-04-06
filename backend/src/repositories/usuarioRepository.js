/**
 * Repository de Usuários
 * Camada de acesso ao banco para operações com usuários
 */
const { pool } = require('../config/database');

const usuarioRepository = {
  /** Busca usuário por email */
  async buscarPorEmail(email) {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    return rows[0] || null;
  },

  /** Busca usuário por ID (sem senha_hash) */
  async buscarPorId(id) {
    const [rows] = await pool.execute(
      'SELECT id, nome, email, role, ativo, criado_em FROM usuarios WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  /** Busca usuário por ID — retorna apenas campos seguros (nunca senha_hash) */
  async buscarPorIdSeguro(id) {
    const [rows] = await pool.execute(
      'SELECT id, nome, email, role FROM usuarios WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  /** Cria novo usuário */
  async criar({ nome, email, senha_hash, role = 'user' }) {
    const [result] = await pool.execute(
      'INSERT INTO usuarios (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)',
      [nome, email, senha_hash, role]
    );
    return { id: result.insertId, nome, email, role };
  },

  /** Lista todos os usuários (sem senha) */
  async listarTodos() {
    const [rows] = await pool.execute(
      'SELECT id, nome, email, role, ativo, criado_em FROM usuarios'
    );
    return rows;
  }
};

module.exports = usuarioRepository;
