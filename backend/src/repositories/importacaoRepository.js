/**
 * Repository de Importações
 * Registra e consulta histórico de importações de Excel
 */
const { db } = require('../config/database');

const importacaoRepository = {
  /** Registra uma nova importação */
  registrar({ nome_arquivo, registros_inseridos, registros_ignorados, usuario_id }) {
    const stmt = db.prepare(`
      INSERT INTO importacoes (nome_arquivo, registros_inseridos, registros_ignorados, usuario_id)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(nome_arquivo, registros_inseridos, registros_ignorados, usuario_id);
    return { id: result.lastInsertRowid };
  },

  /** Lista histórico de importações */
  listarHistorico(limite = 50) {
    return db.prepare(`
      SELECT i.*, u.nome as usuario_nome
      FROM importacoes i
      LEFT JOIN usuarios u ON u.id = i.usuario_id
      ORDER BY i.data_importacao DESC
      LIMIT ?
    `).all(limite);
  }
};

module.exports = importacaoRepository;
