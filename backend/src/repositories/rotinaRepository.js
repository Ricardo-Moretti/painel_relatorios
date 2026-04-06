/**
 * Repository de Rotinas
 * Acesso ao banco para operações com rotinas e execuções
 */
const { db } = require('../config/database');

const rotinaRepository = {
  /** Lista todas as rotinas ativas */
  listarTodas() {
    return db.prepare('SELECT * FROM rotinas WHERE ativa = 1 ORDER BY nome').all();
  },

  /** Busca rotina por ID */
  buscarPorId(id) {
    return db.prepare('SELECT * FROM rotinas WHERE id = ?').get(id);
  },

  /** Busca rotina por nome */
  buscarPorNome(nome) {
    return db.prepare('SELECT * FROM rotinas WHERE nome = ?').get(nome);
  },

  /** Cria nova rotina */
  criar({ nome, frequencia = 'Diária' }) {
    const stmt = db.prepare('INSERT INTO rotinas (nome, frequencia) VALUES (?, ?)');
    const result = stmt.run(nome, frequencia);
    return { id: result.lastInsertRowid, nome, frequencia };
  },

  /** Cria rotina se não existir, retorna a existente se já existir */
  criarOuBuscar(nome, frequencia = 'Diária') {
    const existente = this.buscarPorNome(nome);
    if (existente) return existente;
    return this.criar({ nome, frequencia });
  },

  /** Insere execução (ignora duplicata por rotina+data) */
  inserirExecucao({ rotina_id, data_execucao, status, detalhes, origem_arquivo }) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO execucoes (rotina_id, data_execucao, status, detalhes, origem_arquivo)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(rotina_id, data_execucao, status, detalhes, origem_arquivo);
    return result.changes > 0;
  },

  /** Busca execuções por período */
  buscarExecucoes({ dataInicio, dataFim, rotinaId }) {
    let query = `
      SELECT e.*, r.nome as rotina_nome, r.frequencia
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
    return db.prepare(query).all(...params);
  },

  /** Busca última execução de cada rotina */
  buscarUltimasExecucoes() {
    return db.prepare(`
      SELECT e.*, r.nome as rotina_nome, r.frequencia
      FROM execucoes e
      JOIN rotinas r ON r.id = e.rotina_id
      WHERE e.data_execucao = (
        SELECT MAX(e2.data_execucao) FROM execucoes e2 WHERE e2.rotina_id = e.rotina_id
      )
      ORDER BY r.nome
    `).all();
  },

  /** Conta execuções por status em um período */
  contarPorStatus({ dataInicio, dataFim }) {
    return db.prepare(`
      SELECT status, COUNT(*) as total
      FROM execucoes
      WHERE data_execucao >= ? AND data_execucao <= ?
      GROUP BY status
    `).all(dataInicio, dataFim);
  },

  /** Dados para gráfico temporal (últimos N dias) */
  dadosTemporais(dias = 30) {
    return db.prepare(`
      SELECT data_execucao as data,
        SUM(CASE WHEN status = 'Sucesso' THEN 1 ELSE 0 END) as sucesso,
        SUM(CASE WHEN status = 'Erro' THEN 1 ELSE 0 END) as erro,
        SUM(CASE WHEN status = 'Parcial' THEN 1 ELSE 0 END) as parcial
      FROM execucoes
      WHERE data_execucao >= date('now', ?)
      GROUP BY data_execucao
      ORDER BY data_execucao ASC
    `).all(`-${dias} days`);
  },

  /** Performance por rotina */
  performancePorRotina({ dataInicio, dataFim }) {
    return db.prepare(`
      SELECT r.id, r.nome, r.frequencia,
        COUNT(*) as total,
        SUM(CASE WHEN e.status = 'Sucesso' THEN 1 ELSE 0 END) as sucesso,
        SUM(CASE WHEN e.status = 'Erro' THEN 1 ELSE 0 END) as erro,
        SUM(CASE WHEN e.status = 'Parcial' THEN 1 ELSE 0 END) as parcial
      FROM rotinas r
      LEFT JOIN execucoes e ON e.rotina_id = r.id
        AND e.data_execucao >= ? AND e.data_execucao <= ?
      WHERE r.ativa = 1
      GROUP BY r.id
      ORDER BY r.nome
    `).all(dataInicio, dataFim);
  },

  /** Dados para heatmap (rotina x dia) */
  dadosHeatmap(dias = 30) {
    return db.prepare(`
      SELECT r.nome as rotina, e.data_execucao as data, e.status
      FROM execucoes e
      JOIN rotinas r ON r.id = e.rotina_id
      WHERE e.data_execucao >= date('now', ?)
      ORDER BY r.nome, e.data_execucao
    `).all(`-${dias} days`);
  },

  /** Execuções consecutivas com erro por rotina (para alertas) */
  errosConsecutivos() {
    return db.prepare(`
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
      GROUP BY u.rotina_id
      HAVING dias_consecutivos_erro >= 2
    `).all();
  },

  /** Rotinas sem execução recente */
  rotinasSemExecucao(dias = 3) {
    return db.prepare(`
      SELECT r.id, r.nome, r.frequencia,
        MAX(e.data_execucao) as ultima_execucao
      FROM rotinas r
      LEFT JOIN execucoes e ON e.rotina_id = r.id
      WHERE r.ativa = 1
      GROUP BY r.id
      HAVING ultima_execucao IS NULL OR ultima_execucao < date('now', ?)
    `).all(`-${dias} days`);
  },

  /** Dias consecutivos sem falha por rotina (streak real) */
  diasSemErro() {
    // Para cada rotina, conta quantos dias consecutivos de Sucesso/Parcial
    // partindo da execução mais recente pra trás. Se a última é Erro, streak = 0.
    const rotinas = db.prepare('SELECT id, nome FROM rotinas WHERE ativa = 1 ORDER BY nome').all();
    return rotinas.map(r => {
      const execs = db.prepare(`
        SELECT data_execucao, status FROM execucoes
        WHERE rotina_id = ? ORDER BY data_execucao DESC
      `).all(r.id);

      let streak = 0;
      for (const e of execs) {
        if (e.status === 'Erro') break;
        streak++;
      }
      return { id: r.id, nome: r.nome, dias_sem_erro: streak };
    }).sort((a, b) => b.dias_sem_erro - a.dias_sem_erro);
  },

  /** SLA/Disponibilidade por rotina nos últimos N dias */
  slaDisponibilidade(dias = 30) {
    return db.prepare(`
      SELECT r.id, r.nome,
        COUNT(*) as total,
        SUM(CASE WHEN e.status = 'Sucesso' THEN 1 ELSE 0 END) as sucesso,
        ROUND(SUM(CASE WHEN e.status = 'Sucesso' THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as disponibilidade
      FROM rotinas r
      JOIN execucoes e ON e.rotina_id = r.id
      WHERE r.ativa = 1 AND e.data_execucao >= date('now', ?)
      GROUP BY r.id
      ORDER BY disponibilidade DESC
    `).all(`-${dias} days`);
  },

  /** Taxa de sucesso por rotina */
  taxaSucessoPorRotina({ dataInicio, dataFim }) {
    return db.prepare(`
      SELECT r.id, r.nome,
        COUNT(*) as total,
        SUM(CASE WHEN e.status = 'Sucesso' THEN 1 ELSE 0 END) as sucesso,
        ROUND(SUM(CASE WHEN e.status = 'Sucesso' THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as taxa_sucesso
      FROM rotinas r
      JOIN execucoes e ON e.rotina_id = r.id
      WHERE r.ativa = 1 AND e.data_execucao >= ? AND e.data_execucao <= ?
      GROUP BY r.id
      ORDER BY taxa_sucesso DESC
    `).all(dataInicio, dataFim);
  },

  /** Histórico completo de uma rotina */
  historicoRotina(rotinaId, dias = 90) {
    return db.prepare(`
      SELECT e.data_execucao as data, e.status, e.detalhes, e.data_importacao
      FROM execucoes e
      WHERE e.rotina_id = ?
        AND e.data_execucao >= date('now', ?)
      ORDER BY e.data_execucao DESC
    `).all(rotinaId, `-${dias} days`);
  },

  /** Dados para calendário heatmap de um mês (YYYY-MM) */
  dadosCalendarioHeatmap(mes) {
    return db.prepare(`
      SELECT e.data_execucao as data,
        SUM(CASE WHEN e.status = 'Sucesso' THEN 1 ELSE 0 END) as sucesso,
        SUM(CASE WHEN e.status = 'Erro' THEN 1 ELSE 0 END) as erro,
        SUM(CASE WHEN e.status = 'Parcial' THEN 1 ELSE 0 END) as parcial
      FROM execucoes e
      WHERE strftime('%Y-%m', e.data_execucao) = ?
      GROUP BY e.data_execucao
      ORDER BY e.data_execucao
    `).all(mes);
  }
};

module.exports = rotinaRepository;
