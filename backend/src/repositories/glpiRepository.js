/**
 * Repository de Indicadores GLPI
 * Gerencia dados de chamados GLPI
 */
const { pool } = require('../config/database');

const glpiRepository = {
  /** Insere ou atualiza indicador do dia */
  async upsert({ data, quantidade }) {
    await pool.execute(
      'INSERT INTO indicadores_glpi (data, quantidade) VALUES (?, ?) ON DUPLICATE KEY UPDATE quantidade = ?',
      [data, quantidade, quantidade]
    );
  },

  /** Busca indicadores por período */
  async buscarPorPeriodo(dataInicio, dataFim) {
    const [rows] = await pool.execute(
      'SELECT * FROM indicadores_glpi WHERE data >= ? AND data <= ? ORDER BY data ASC',
      [dataInicio, dataFim]
    );
    return rows;
  },

  /** Busca indicador de hoje */
  async buscarHoje() {
    const [rows] = await pool.execute(
      'SELECT * FROM indicadores_glpi WHERE data = CURDATE()'
    );
    return rows[0] || null;
  },

  /** Estatísticas GLPI */
  async estatisticas(dias = 30) {
    const [rows] = await pool.execute(
      `SELECT
        AVG(quantidade) as media,
        MAX(quantidade) as maximo,
        MIN(quantidade) as minimo,
        SUM(quantidade) as total
       FROM indicadores_glpi
       WHERE data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [dias]
    );
    return rows[0] || null;
  },

  /** GLPI tendência com dados para chart */
  async buscarTendencia(dias = 90) {
    const [rows] = await pool.execute(
      `SELECT data, quantidade
       FROM indicadores_glpi
       WHERE data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY data ASC`,
      [dias]
    );
    return rows;
  },

  /** GLPI envelhecimento — extrai número de detalhes "X com mais de 45 dias" */
  async buscarEnvelhecimento(dias = 30) {
    const [rows] = await pool.execute(
      `SELECT e.data_execucao as data, e.detalhes,
        CAST(SUBSTRING_INDEX(e.detalhes, ' ', 1) AS UNSIGNED) as envelhecidos
       FROM execucoes e
       JOIN rotinas r ON r.id = e.rotina_id
       WHERE r.nome = 'GLPI'
         AND e.detalhes LIKE '%mais de 45%'
         AND e.data_execucao >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY e.data_execucao ASC`,
      [dias]
    );
    return rows;
  }
};

module.exports = glpiRepository;
