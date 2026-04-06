/**
 * Repository de Rotinas
 * Acesso ao banco para operações com rotinas e execuções
 */
const { pool } = require('../config/database');

const rotinaRepository = {
  /** Lista todas as rotinas ativas */
  async listarTodas() {
    const [rows] = await pool.execute('SELECT * FROM rotinas WHERE ativa = 1 ORDER BY nome');
    return rows;
  },

  /** Busca rotina por ID */
  async buscarPorId(id) {
    const [rows] = await pool.execute('SELECT * FROM rotinas WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /** Busca rotina por nome */
  async buscarPorNome(nome) {
    const [rows] = await pool.execute('SELECT * FROM rotinas WHERE nome = ?', [nome]);
    return rows[0] || null;
  },

  /** Cria nova rotina */
  async criar({ nome, frequencia = 'Diária' }) {
    const [result] = await pool.execute('INSERT INTO rotinas (nome, frequencia) VALUES (?, ?)', [nome, frequencia]);
    return { id: result.insertId, nome, frequencia };
  },

  /** Cria rotina se não existir, retorna a existente se já existir */
  async criarOuBuscar(nome, frequencia = 'Diária') {
    const existente = await this.buscarPorNome(nome);
    if (existente) return existente;
    return this.criar({ nome, frequencia });
  },

  /** Insere execução (ignora duplicata por rotina+data) */
  async inserirExecucao({ rotina_id, data_execucao, status, detalhes, origem_arquivo }) {
    const [result] = await pool.execute(
      'INSERT IGNORE INTO execucoes (rotina_id, data_execucao, status, detalhes, origem_arquivo) VALUES (?, ?, ?, ?, ?)',
      [rotina_id, data_execucao, status, detalhes, origem_arquivo]
    );
    return result.affectedRows > 0;
  },

  /** Busca execuções por período */
  async buscarExecucoes({ dataInicio, dataFim, rotinaId }) {
    let query = `
      SELECT e.rotina_id, e.status, e.detalhes, e.origem_arquivo, e.data_importacao,
             DATE_FORMAT(e.data_execucao, '%Y-%m-%d') as data_execucao,
             r.nome as rotina_nome, r.frequencia
      FROM execucoes e
      JOIN rotinas r ON r.id = e.rotina_id
      WHERE 1=1
    `;
    const params = [];

    if (dataInicio) {
      query += ' AND e.data_execucao >= ?';
      params.push(dataInicio);
    }
    if (dataFim) {
      query += ' AND e.data_execucao <= ?';
      params.push(dataFim);
    }
    if (rotinaId) {
      query += ' AND e.rotina_id = ?';
      params.push(rotinaId);
    }

    query += ' ORDER BY e.data_execucao DESC, r.nome ASC';
    const [rows] = await pool.execute(query, params);
    return rows;
  },

  /** Busca última execução de cada rotina */
  async buscarUltimasExecucoes() {
    const [rows] = await pool.execute(`
      SELECT e.rotina_id, e.status, e.detalhes, e.origem_arquivo, e.data_importacao,
             DATE_FORMAT(e.data_execucao, '%Y-%m-%d') as data_execucao,
             r.nome as rotina_nome, r.frequencia
      FROM execucoes e
      JOIN rotinas r ON r.id = e.rotina_id
      WHERE e.data_execucao = (
        SELECT MAX(e2.data_execucao) FROM execucoes e2 WHERE e2.rotina_id = e.rotina_id
      )
      ORDER BY r.nome
    `);
    return rows;
  },

  /** Conta execuções por status em um período */
  async contarPorStatus({ dataInicio, dataFim }) {
    const [rows] = await pool.execute(
      `SELECT status, COUNT(*) as total
       FROM execucoes
       WHERE data_execucao >= ? AND data_execucao <= ?
       GROUP BY status`,
      [dataInicio, dataFim]
    );
    return rows;
  },

  /** Dados para gráfico temporal (últimos N dias) */
  async dadosTemporais(dias = 30) {
    const [rows] = await pool.execute(
      `SELECT DATE_FORMAT(data_execucao, '%Y-%m-%d') as data,
        SUM(CASE WHEN status = 'Sucesso' THEN 1 ELSE 0 END) as sucesso,
        SUM(CASE WHEN status = 'Erro' THEN 1 ELSE 0 END) as erro,
        SUM(CASE WHEN status = 'Parcial' THEN 1 ELSE 0 END) as parcial
       FROM execucoes
       WHERE data_execucao >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY data_execucao
       ORDER BY data_execucao ASC`,
      [dias]
    );
    return rows;
  },

  /** Performance por rotina */
  async performancePorRotina({ dataInicio, dataFim }) {
    const [rows] = await pool.execute(
      `SELECT r.id, r.nome, r.frequencia,
        COUNT(*) as total,
        SUM(CASE WHEN e.status = 'Sucesso' THEN 1 ELSE 0 END) as sucesso,
        SUM(CASE WHEN e.status = 'Erro' THEN 1 ELSE 0 END) as erro,
        SUM(CASE WHEN e.status = 'Parcial' THEN 1 ELSE 0 END) as parcial
       FROM rotinas r
       LEFT JOIN execucoes e ON e.rotina_id = r.id
         AND e.data_execucao >= ? AND e.data_execucao <= ?
       WHERE r.ativa = 1
       GROUP BY r.id
       ORDER BY r.nome`,
      [dataInicio, dataFim]
    );
    return rows;
  },

  /** Dados para heatmap (rotina x dia) */
  async dadosHeatmap(dias = 30) {
    const [rows] = await pool.execute(
      `SELECT r.nome as rotina, DATE_FORMAT(e.data_execucao, '%Y-%m-%d') as data, e.status
       FROM execucoes e
       JOIN rotinas r ON r.id = e.rotina_id
       WHERE e.data_execucao >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY r.nome, e.data_execucao`,
      [dias]
    );
    return rows;
  },

  /** Execuções consecutivas com erro por rotina (para alertas) */
  async errosConsecutivos() {
    const [rows] = await pool.execute(`
      WITH ultimas AS (
        SELECT rotina_id, data_execucao, status,
          ROW_NUMBER() OVER (PARTITION BY rotina_id ORDER BY data_execucao DESC) as rn
        FROM execucoes
      )
      SELECT r.id, r.nome,
        COUNT(*) as dias_consecutivos_erro
      FROM ultimas u
      JOIN rotinas r ON r.id = u.rotina_id
      WHERE u.status = 'Erro' AND u.rn <= 5
      GROUP BY u.rotina_id, r.id, r.nome
      HAVING dias_consecutivos_erro >= 2
    `);
    return rows;
  },

  /** Rotinas sem execução recente */
  async rotinasSemExecucao(dias = 3) {
    const [rows] = await pool.execute(
      `SELECT r.id, r.nome, r.frequencia,
        MAX(e.data_execucao) as ultima_execucao
       FROM rotinas r
       LEFT JOIN execucoes e ON e.rotina_id = r.id
       WHERE r.ativa = 1
       GROUP BY r.id
       HAVING ultima_execucao IS NULL OR ultima_execucao < DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [dias]
    );
    return rows;
  },

  /** Dias consecutivos sem falha por rotina (streak real) */
  async diasSemErro() {
    const [rotinas] = await pool.execute('SELECT id, nome FROM rotinas WHERE ativa = 1 ORDER BY nome');
    const resultados = await Promise.all(rotinas.map(async (r) => {
      const [execs] = await pool.execute(
        'SELECT data_execucao, status FROM execucoes WHERE rotina_id = ? ORDER BY data_execucao DESC',
        [r.id]
      );
      let streak = 0;
      for (const e of execs) {
        if (e.status === 'Erro') break;
        streak++;
      }
      return { id: r.id, nome: r.nome, dias_sem_erro: streak };
    }));
    return resultados.sort((a, b) => b.dias_sem_erro - a.dias_sem_erro);
  },

  /** SLA/Disponibilidade por rotina nos últimos N dias */
  async slaDisponibilidade(dias = 30) {
    const [rows] = await pool.execute(
      `SELECT r.id, r.nome,
        COUNT(*) as total,
        SUM(CASE WHEN e.status = 'Sucesso' THEN 1 ELSE 0 END) as sucesso,
        ROUND(SUM(CASE WHEN e.status = 'Sucesso' THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as disponibilidade
       FROM rotinas r
       JOIN execucoes e ON e.rotina_id = r.id
       WHERE r.ativa = 1 AND e.data_execucao >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY r.id
       ORDER BY disponibilidade DESC`,
      [dias]
    );
    return rows;
  },

  /** Taxa de sucesso por rotina */
  async taxaSucessoPorRotina({ dataInicio, dataFim }) {
    const [rows] = await pool.execute(
      `SELECT r.id, r.nome,
        COUNT(*) as total,
        SUM(CASE WHEN e.status = 'Sucesso' THEN 1 ELSE 0 END) as sucesso,
        ROUND(SUM(CASE WHEN e.status = 'Sucesso' THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as taxa_sucesso
       FROM rotinas r
       JOIN execucoes e ON e.rotina_id = r.id
       WHERE r.ativa = 1 AND e.data_execucao >= ? AND e.data_execucao <= ?
       GROUP BY r.id
       ORDER BY taxa_sucesso DESC`,
      [dataInicio, dataFim]
    );
    return rows;
  },

  /** Histórico completo de uma rotina */
  async historicoRotina(rotinaId, dias = 90) {
    const [rows] = await pool.execute(
      `SELECT DATE_FORMAT(e.data_execucao, '%Y-%m-%d') as data, e.status, e.detalhes, e.data_importacao
       FROM execucoes e
       WHERE e.rotina_id = ?
         AND e.data_execucao >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY e.data_execucao DESC`,
      [rotinaId, dias]
    );
    return rows;
  },

  /** Dados para calendário heatmap de um mês (YYYY-MM) */
  async dadosCalendarioHeatmap(mes) {
    const [rows] = await pool.execute(
      `SELECT DATE_FORMAT(e.data_execucao, '%Y-%m-%d') as data,
        SUM(CASE WHEN e.status = 'Sucesso' THEN 1 ELSE 0 END) as sucesso,
        SUM(CASE WHEN e.status = 'Erro' THEN 1 ELSE 0 END) as erro,
        SUM(CASE WHEN e.status = 'Parcial' THEN 1 ELSE 0 END) as parcial
       FROM execucoes e
       WHERE DATE_FORMAT(e.data_execucao, '%Y-%m') = ?
       GROUP BY e.data_execucao
       ORDER BY e.data_execucao`,
      [mes]
    );
    return rows;
  }
};

module.exports = rotinaRepository;
