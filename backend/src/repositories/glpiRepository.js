/**
 * Repository de Indicadores GLPI
 * Gerencia dados de chamados GLPI
 */
const { db } = require('../config/database');

const glpiRepository = {
  /** Insere ou atualiza indicador do dia */
  upsert({ data, quantidade }) {
    const stmt = db.prepare(`
      INSERT INTO indicadores_glpi (data, quantidade)
      VALUES (?, ?)
      ON CONFLICT(data) DO UPDATE SET quantidade = ?
    `);
    stmt.run(data, quantidade, quantidade);
  },

  /** Busca indicadores por período */
  buscarPorPeriodo(dataInicio, dataFim) {
    return db.prepare(`
      SELECT * FROM indicadores_glpi
      WHERE data >= ? AND data <= ?
      ORDER BY data ASC
    `).all(dataInicio, dataFim);
  },

  /** Busca indicador de hoje */
  buscarHoje() {
    return db.prepare(`
      SELECT * FROM indicadores_glpi WHERE data = date('now')
    `).get();
  },

  /** Estatísticas GLPI */
  estatisticas(dias = 30) {
    return db.prepare(`
      SELECT
        AVG(quantidade) as media,
        MAX(quantidade) as maximo,
        MIN(quantidade) as minimo,
        SUM(quantidade) as total
      FROM indicadores_glpi
      WHERE data >= date('now', ?)
    `).get(`-${dias} days`);
  },

  /** GLPI tendência com dados para chart */
  buscarTendencia(dias = 90) {
    return db.prepare(`
      SELECT data, quantidade
      FROM indicadores_glpi
      WHERE data >= date('now', ?)
      ORDER BY data ASC
    `).all(`-${dias} days`);
  },

  /** GLPI envelhecimento — extrai número de detalhes "X com mais de 45 dias" */
  buscarEnvelhecimento(dias = 30) {
    return db.prepare(`
      SELECT e.data_execucao as data, e.detalhes,
        CAST(SUBSTR(e.detalhes, 1, INSTR(e.detalhes, ' ') - 1) AS INTEGER) as envelhecidos
      FROM execucoes e
      JOIN rotinas r ON r.id = e.rotina_id
      WHERE r.nome = 'GLPI'
        AND e.detalhes LIKE '%mais de 45%'
        AND e.data_execucao >= date('now', ?)
      ORDER BY e.data_execucao ASC
    `).all(`-${dias} days`);
  }
};

module.exports = glpiRepository;
