/**
 * Repository de Importações
 * Registra e consulta histórico de importações de Excel
 */
const { pool } = require('../config/database');

const importacaoRepository = {
  /** Registra uma nova importação */
  async registrar({ nome_arquivo, registros_inseridos, registros_ignorados, usuario_id }) {
    const [result] = await pool.execute(
      'INSERT INTO importacoes (nome_arquivo, registros_inseridos, registros_ignorados, usuario_id) VALUES (?, ?, ?, ?)',
      [nome_arquivo, registros_inseridos, registros_ignorados, usuario_id]
    );
    return { id: result.insertId };
  },

  /** Lista histórico de importações */
  async listarHistorico(limite = 50) {
    const [rows] = await pool.execute(
      `SELECT i.*, u.nome as usuario_nome
       FROM importacoes i
       LEFT JOIN usuarios u ON u.id = i.usuario_id
       ORDER BY i.data_importacao DESC
       LIMIT ?`,
      [limite]
    );
    return rows;
  }
};

module.exports = importacaoRepository;
