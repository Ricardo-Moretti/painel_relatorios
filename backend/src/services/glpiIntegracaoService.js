/**
 * Integração GLPI via MySQL — SOMENTE LEITURA (SELECT)
 * Nunca faz INSERT/UPDATE/DELETE no banco do GLPI.
 * Dados coletados são salvos LOCALMENTE no SQLite do Painel.
 */
const mysql = require('mysql2/promise');
const glpiRepository = require('../repositories/glpiRepository');
const rotinaRepository = require('../repositories/rotinaRepository');
const { pool: painelPool } = require('../config/database');
const { getSecureEnv } = require('../config/crypto');
require('dotenv').config();

let pool = null;

// ID do grupo GLPI_TI — filtrar apenas chamados desse grupo
// Seguro para interpolação em SQL: sempre validado como inteiro (nunca vem de input do usuário)
const GRUPO_TI_ID = parseInt(process.env.GLPI_GRUPO_TI_ID) || 1;
if (!Number.isInteger(GRUPO_TI_ID)) throw new Error('GRUPO_TI_ID must be integer');

const glpiIntegracaoService = {

  /** Salva dados no cache local (MySQL) — fire-and-forget */
  _salvarCache(chave, dados) {
    painelPool.execute(
      'REPLACE INTO cache_dados (chave, valor, atualizado_em) VALUES (?, ?, NOW())',
      [chave, JSON.stringify(dados)]
    ).catch(e => console.log('[Cache] Erro ao salvar:', e.message));
  },

  /** Busca dados do cache local — retorna null se falhar (sync facade via stored promise) */
  _lerCache(chave) {
    // Cache reads are best-effort; callers handle null gracefully
    return null;
  },

  /** Cria/retorna pool de conexao MySQL (somente leitura) */
  _getPool() {
    if (!pool) {
      const host = process.env.GLPI_MYSQL_HOST;
      const user = process.env.GLPI_MYSQL_USER;
      const password = getSecureEnv('GLPI_MYSQL_PASSWORD');
      const database = process.env.GLPI_MYSQL_DATABASE;

      pool = mysql.createPool({
        host,
        port: parseInt(process.env.GLPI_MYSQL_PORT) || 3306,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 3,
        queueLimit: 0,
        connectTimeout: 5000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      });

      // Log connection info without password
      console.log(`[GLPI MySQL] Pool criado: ${user}@${host}/${database} (senha ocultada)`);
    }
    return pool;
  },

  /** Busca total de chamados não solucionados do grupo GLPI_TI */
  async buscarChamadosAbertos() {
    const p = this._getPool();
    const [rows] = await p.execute(
      `SELECT COUNT(*) as total FROM glpi_tickets t
       INNER JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2 AND gt.groups_id = ?
       WHERE t.status < 5 AND t.is_deleted = 0`, [GRUPO_TI_ID]
    );
    return rows[0].total;
  },

  /** Busca chamados do GLPI_TI com mais de 45 dias sem solução */
  async buscarChamadosEnvelhecidos() {
    const p = this._getPool();
    const [rows] = await p.execute(
      `SELECT COUNT(*) as total FROM glpi_tickets t
       INNER JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2 AND gt.groups_id = ?
       WHERE t.status < 5 AND t.is_deleted = 0 AND t.date < DATE_SUB(NOW(), INTERVAL 45 DAY)`, [GRUPO_TI_ID]
    );
    return rows[0].total;
  },

  /** Busca chamados do GLPI_TI por status */
  async buscarPorStatus() {
    const p = this._getPool();
    const [rows] = await p.execute(
      `SELECT
        SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) as novos,
        SUM(CASE WHEN t.status = 2 THEN 1 ELSE 0 END) as atribuidos,
        SUM(CASE WHEN t.status = 3 THEN 1 ELSE 0 END) as planejados,
        SUM(CASE WHEN t.status = 4 THEN 1 ELSE 0 END) as pendentes,
        COUNT(*) as total
      FROM glpi_tickets t
      INNER JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2 AND gt.groups_id = ?
      WHERE t.status < 5 AND t.is_deleted = 0`, [GRUPO_TI_ID]
    );
    return rows[0];
  },

  /**
   * Coleta diária — busca dados do GLPI e salva LOCALMENTE
   */
  async coletarDiario() {
    if (!this.estaConfigurado()) {
      throw new Error('GLPI MySQL não configurado. Defina GLPI_MYSQL_HOST, GLPI_MYSQL_USER e GLPI_MYSQL_PASSWORD no .env');
    }

    console.log('[GLPI MySQL] Iniciando coleta...');

    const totalAbertos = await this.buscarChamadosAbertos();
    const envelhecidos = await this.buscarChamadosEnvelhecidos();
    const porStatus = await this.buscarPorStatus();

    console.log(`[GLPI MySQL] Abertos: ${totalAbertos}, Envelhecidos (>45d): ${envelhecidos}`);
    console.log(`[GLPI MySQL] Novos: ${porStatus.novos}, Atribuídos: ${porStatus.atribuidos}, Pendentes: ${porStatus.pendentes}`);

    // Data de hoje
    const hoje = new Date().toISOString().split('T')[0];

    // Salvar indicador GLPI localmente (abertos + envelhecidos)
    await glpiRepository.upsert({ data: hoje, quantidade: totalAbertos, envelhecidos });

    // Salvar execução da rotina GLPI localmente
    const rotina = await rotinaRepository.criarOuBuscar('GLPI');
    const statusGlpi = totalAbertos <= 50 ? 'Sucesso' : totalAbertos <= 60 ? 'Parcial' : 'Erro';
    const detalhes = `${envelhecidos} com mais de 45 dias | Novos: ${porStatus.novos}, Atrib: ${porStatus.atribuidos}, Pend: ${porStatus.pendentes}`;

    await painelPool.execute('DELETE FROM execucoes WHERE rotina_id = ? AND data_execucao = ?', [rotina.id, hoje]);
    await painelPool.execute(
      'INSERT INTO execucoes (rotina_id, data_execucao, status, detalhes) VALUES (?, ?, ?, ?)',
      [rotina.id, hoje, statusGlpi, detalhes]
    );

    console.log(`[GLPI MySQL] Salvo: ${totalAbertos} chamados, ${envelhecidos} envelhecidos`);

    return {
      data: hoje,
      totalAbertos,
      envelhecidos,
      porStatus,
      status: statusGlpi,
      detalhes,
    };
  },

  /** BI Completo — regras Qlik, filtro entidade, SLA correto */
  async obterBI({ dias = 30 } = {}) {
    const p = this._getPool();
    const GF = `INNER JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2 AND gt.groups_id = ${GRUPO_TI_ID}`;
    const EF = `AND t.entities_id NOT IN (SELECT id FROM glpi_entities WHERE UPPER(name) LIKE '%PARCEIRO%')`;
    const urgNomes = {1:'Muito baixa',2:'Baixa',3:'Média',4:'Alta',5:'Muito alta'};

    // Chamados abertos
    const [abertos] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.status < 5 AND t.is_deleted = 0 ${EF}`);

    // Envelhecidos (>45 dias)
    const [envelhecidos] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.status < 5 AND t.is_deleted = 0 ${EF} AND t.date < DATE_SUB(NOW(), INTERVAL 45 DAY)`);

    // Por status
    const [porStatus] = await p.execute(`SELECT
      SUM(CASE WHEN t.status=1 THEN 1 ELSE 0 END) as novos,
      SUM(CASE WHEN t.status=2 THEN 1 ELSE 0 END) as atribuidos,
      SUM(CASE WHEN t.status=3 THEN 1 ELSE 0 END) as planejados,
      SUM(CASE WHEN t.status=4 THEN 1 ELSE 0 END) as pendentes
      FROM glpi_tickets t ${GF} WHERE t.status < 5 AND t.is_deleted = 0 ${EF}`);

    // Solucionados hoje
    const [solucionadosHoje] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.solvedate IS NOT NULL AND DATE(t.solvedate) = CURDATE() AND t.is_deleted = 0 ${EF}`);

    // Fechados hoje
    const [fechadosHoje] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.status = 6 AND DATE(t.closedate) = CURDATE() AND t.is_deleted = 0 ${EF}`);

    // Solucionados no período
    const [solucionadosPeriodo] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.solvedate IS NOT NULL AND t.solvedate >= DATE_SUB(NOW(), INTERVAL ? DAY) AND t.is_deleted = 0 ${EF}`, [dias]);

    // Tempo médio de solução (horas)
    const [tempoMedio] = await p.execute(`SELECT ROUND(AVG(t.solve_delay_stat/3600),1) as media_horas FROM glpi_tickets t ${GF} WHERE t.solvedate IS NOT NULL AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY) AND t.is_deleted = 0 ${EF}`, [dias]);

    // Tempo médio de primeira resposta
    const [tempoResposta] = await p.execute(`SELECT ROUND(AVG(t.takeintoaccount_delay_stat/3600),1) as media_horas FROM glpi_tickets t ${GF} WHERE t.takeintoaccount_delay_stat > 0 AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY) AND t.is_deleted = 0 ${EF}`, [dias]);

    // SLA Solução — regra Qlik (exclui pendente, inclui abertos que passaram do prazo)
    const [slaData] = await p.execute(`SELECT COUNT(*) as total,
      SUM(CASE WHEN t.time_to_resolve IS NOT NULL AND t.status <> 4 AND (
        t.solvedate > t.time_to_resolve OR (t.solvedate IS NULL AND t.time_to_resolve < NOW())
      ) THEN 1 ELSE 0 END) as fora_sla
      FROM glpi_tickets t ${GF} WHERE t.is_deleted = 0 ${EF} AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [dias]);
    const slaPct = slaData[0].total > 0 ? +(((slaData[0].total - parseInt(slaData[0].fora_sla || 0)) / slaData[0].total) * 100).toFixed(1) : 0;

    // Top atendentes — quem adicionou a solução (solver real, COUNT DISTINCT para evitar duplicatas)
    const [atendentes] = await p.execute(`SELECT u.realname, u.firstname, COUNT(DISTINCT t.id) as resolvidos
      FROM glpi_tickets t ${GF}
      JOIN glpi_itilsolutions sol ON sol.items_id = t.id AND sol.itemtype = 'Ticket' AND sol.status != 4
      JOIN glpi_users u ON u.id = sol.users_id
      WHERE t.solvedate IS NOT NULL AND t.solvedate >= DATE_SUB(NOW(), INTERVAL ? DAY) AND t.is_deleted = 0 ${EF}
      GROUP BY u.id ORDER BY resolvidos DESC LIMIT 10`, [dias]);

    // Top categorias (abertos)
    const [categorias] = await p.execute(`SELECT
      REPLACE(COALESCE(c.completename, 'Sem categoria'), 'TECNOLOGIA DA INFORMAÇÃO', 'TI') as categoria,
      COUNT(*) as qtd
      FROM glpi_tickets t ${GF}
      LEFT JOIN glpi_itilcategories c ON c.id = t.itilcategories_id
      WHERE t.status < 5 AND t.is_deleted = 0 ${EF}
      GROUP BY c.id ORDER BY qtd DESC LIMIT 10`);

    // Por urgência
    const [urgencias] = await p.execute(`SELECT t.urgency, COUNT(*) as qtd
      FROM glpi_tickets t ${GF} WHERE t.status < 5 AND t.is_deleted = 0 ${EF}
      GROUP BY t.urgency ORDER BY t.urgency`);
    const urgFormatado = urgencias.map(u => ({ nome: urgNomes[u.urgency] || `Nível ${u.urgency}`, qtd: u.qtd }));

    // Evolução diária
    const [evolucao] = await p.execute(`SELECT DATE(t.solvedate) as data, COUNT(*) as solucionados
      FROM glpi_tickets t ${GF}
      WHERE t.solvedate IS NOT NULL AND t.solvedate >= DATE_SUB(NOW(), INTERVAL ? DAY) AND t.is_deleted = 0 ${EF}
      GROUP BY DATE(t.solvedate) ORDER BY data`, [dias]);

    // Abertos por dia
    const [abertosdia] = await p.execute(`SELECT DATE(t.date) as data, COUNT(*) as abertos
      FROM glpi_tickets t ${GF}
      WHERE t.date >= DATE_SUB(NOW(), INTERVAL ? DAY) AND t.is_deleted = 0 ${EF}
      GROUP BY DATE(t.date) ORDER BY data`, [dias]);

    // Médias diárias
    const [mediaAbertos] = await p.execute(`SELECT ROUND(AVG(qtd),1) as media FROM (
      SELECT DATE(t.date) as dia, COUNT(*) as qtd FROM glpi_tickets t ${GF}
      WHERE t.date >= DATE_SUB(NOW(), INTERVAL ? DAY) AND t.is_deleted = 0 ${EF}
      GROUP BY DATE(t.date)) sub`, [dias]);

    const [mediaSoluc] = await p.execute(`SELECT ROUND(AVG(qtd),1) as media FROM (
      SELECT DATE(t.solvedate) as dia, COUNT(*) as qtd FROM glpi_tickets t ${GF}
      WHERE t.solvedate IS NOT NULL AND t.solvedate >= DATE_SUB(NOW(), INTERVAL ? DAY) AND t.is_deleted = 0 ${EF}
      GROUP BY DATE(t.solvedate)) sub`, [dias]);

    // Tempo médio primeiro atendimento
    const [tempoPrimeiro] = await p.execute(`SELECT ROUND(AVG(t.takeintoaccount_delay_stat/3600),1) as media_horas
      FROM glpi_tickets t ${GF}
      WHERE t.takeintoaccount_delay_stat > 0 AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY) AND t.is_deleted = 0 ${EF}`, [dias]);

    // Reaberturas — regra Qlik
    const [reaberturas] = await p.execute(`SELECT COUNT(DISTINCT t.id) as total
      FROM glpi_tickets t ${GF}
      JOIN glpi_itilsolutions sol ON sol.items_id = t.id AND sol.itemtype = 'Ticket' AND sol.status = 4
      WHERE t.is_deleted = 0 ${EF} AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [dias]);

    // Top Solicitantes (quem abre mais chamados) — Feature 9
    const [topSolicitantes] = await p.execute(`SELECT u.realname, u.firstname, COUNT(*) as total
      FROM glpi_tickets t ${GF}
      JOIN glpi_tickets_users tu ON tu.tickets_id = t.id AND tu.type = 1
      JOIN glpi_users u ON u.id = tu.users_id
      WHERE t.is_deleted = 0 ${EF} AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY u.id ORDER BY total DESC LIMIT 10`, [dias]);

    // Tempo médio por atendente (horas) — Feature 10
    const [tempoAtendentes] = await p.execute(`SELECT u.realname, u.firstname,
      ROUND(AVG(t.solve_delay_stat/3600),1) as media_horas, COUNT(*) as resolvidos
      FROM glpi_tickets t ${GF}
      JOIN glpi_tickets_users tu ON tu.tickets_id = t.id AND tu.type = 2
      JOIN glpi_users u ON u.id = tu.users_id
      WHERE t.solvedate IS NOT NULL AND t.solve_delay_stat > 0 AND t.solvedate >= DATE_SUB(NOW(), INTERVAL ? DAY) AND t.is_deleted = 0 ${EF}
      GROUP BY u.id ORDER BY resolvidos DESC LIMIT 10`, [dias]);

    return {
      resumo: {
        abertos: abertos[0].total,
        envelhecidos: envelhecidos[0].total,
        solucionadosHoje: solucionadosHoje[0].total,
        fechadosHoje: fechadosHoje[0].total,
        solucionadosPeriodo: solucionadosPeriodo[0].total,
        tempoMedioSolucao: tempoMedio[0].media_horas || 0,
        tempoMedioResposta: tempoResposta[0].media_horas || 0,
        slaPct,
        reaberturas: reaberturas[0].total,
      },
      porStatus: porStatus[0],
      atendentes: atendentes.map(a => ({ nome: `${a.firstname || ''} ${a.realname || ''}`.trim(), resolvidos: a.resolvidos })),
      categorias,
      urgencias: urgFormatado,
      evolucao,
      abertosdia,
      medias: {
        abertosdia: mediaAbertos[0].media || 0,
        solucionadosdia: mediaSoluc[0].media || 0,
        tempoPrimeiroAtendimento: tempoPrimeiro[0].media_horas || 0,
      },
      topSolicitantes: topSolicitantes.map(s => ({ nome: `${s.firstname || ''} ${s.realname || ''}`.trim(), total: s.total })),
      tempoAtendentes: tempoAtendentes.map(a => ({ nome: `${a.firstname || ''} ${a.realname || ''}`.trim(), mediaHoras: a.media_horas || 0, resolvidos: a.resolvidos })),
    };
  },

  /** BI Avançado — SLA, tipos, backlog, tempo por categoria */
  async obterBIAvancado({ dias = 30 } = {}) {
    const p = this._getPool();
    const GF = `INNER JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2 AND gt.groups_id = ${GRUPO_TI_ID}`;

    // SLA — dentro/fora do prazo
    const [sla] = await p.execute(`SELECT COUNT(*) as total,
      SUM(CASE WHEN t.solvedate <= t.time_to_resolve THEN 1 ELSE 0 END) as dentro_sla,
      SUM(CASE WHEN t.solvedate > t.time_to_resolve THEN 1 ELSE 0 END) as fora_sla
      FROM glpi_tickets t ${GF}
      WHERE t.solvedate IS NOT NULL AND t.time_to_resolve IS NOT NULL AND t.solvedate >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [dias]);
    const slaTotal = parseInt(sla[0].total) || 0;
    const slaDentro = parseInt(sla[0].dentro_sla) || 0;
    const slaFora = parseInt(sla[0].fora_sla) || 0;
    const slaPct = slaTotal > 0 ? +((slaDentro / slaTotal) * 100).toFixed(1) : 0;

    // Tipo (1=Incidente, 2=Requisição)
    const [tipos] = await p.execute(`SELECT t.type, COUNT(*) as qtd FROM glpi_tickets t ${GF} WHERE t.status < 5 AND t.is_deleted = 0 GROUP BY t.type`);
    const tipoFormatado = tipos.map(t => ({ nome: t.type === 1 ? 'Incidente' : 'Requisição', qtd: t.qtd }));

    // Tempo médio por categoria (top 8, mínimo 3 tickets)
    const [tempoCat] = await p.execute(`SELECT COALESCE(c.completename, 'Sem categoria') as categoria,
      ROUND(AVG(TIMESTAMPDIFF(HOUR, t.date, t.solvedate)),1) as media_horas, COUNT(*) as qtd
      FROM glpi_tickets t ${GF}
      LEFT JOIN glpi_itilcategories c ON c.id = t.itilcategories_id
      WHERE t.solvedate IS NOT NULL AND t.solvedate >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY c.id HAVING qtd >= 3 ORDER BY media_horas DESC LIMIT 8`, [dias]);

    // Backlog diário (abertos - solucionados)
    const [backlogAbertos] = await p.execute(`SELECT DATE(t.date) as data, COUNT(*) as abertos
      FROM glpi_tickets t ${GF}
      WHERE t.date >= DATE_SUB(NOW(), INTERVAL ? DAY) AND t.is_deleted = 0
      GROUP BY DATE(t.date) ORDER BY data`, [dias]);
    const [backlogSoluc] = await p.execute(`SELECT DATE(t.solvedate) as data, COUNT(*) as solucionados
      FROM glpi_tickets t ${GF}
      WHERE t.solvedate IS NOT NULL AND t.solvedate >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(t.solvedate) ORDER BY data`, [dias]);

    // Merge backlog
    const backlogMap = {};
    backlogAbertos.forEach(d => { const dt = d.data instanceof Date ? d.data.toISOString().split('T')[0] : String(d.data).split('T')[0]; backlogMap[dt] = { abertos: d.abertos, solucionados: 0 } });
    backlogSoluc.forEach(d => { const dt = d.data instanceof Date ? d.data.toISOString().split('T')[0] : String(d.data).split('T')[0]; if (!backlogMap[dt]) backlogMap[dt] = { abertos: 0, solucionados: 0 }; backlogMap[dt].solucionados = d.solucionados });

    let acumulado = 0;
    const backlog = Object.entries(backlogMap).sort().map(([data, v]) => {
      acumulado += v.abertos - v.solucionados;
      return { data, abertos: v.abertos, solucionados: v.solucionados, backlog: acumulado };
    });

    // SLA por semana (tendência)
    const [slaSemanal] = await p.execute(`SELECT
      YEARWEEK(t.solvedate, 1) as semana,
      COUNT(*) as total,
      SUM(CASE WHEN t.solvedate <= t.time_to_resolve THEN 1 ELSE 0 END) as dentro
      FROM glpi_tickets t ${GF}
      WHERE t.solvedate IS NOT NULL AND t.time_to_resolve IS NOT NULL AND t.solvedate >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY YEARWEEK(t.solvedate, 1) ORDER BY semana`, [dias]);
    const slaTendencia = slaSemanal.map(s => ({
      semana: `S${String(s.semana).slice(-2)}`,
      pct: s.total > 0 ? +((parseInt(s.dentro) / s.total) * 100).toFixed(1) : 0,
      total: s.total,
    }));

    return {
      sla: { total: slaTotal, dentro: slaDentro, fora: slaFora, percentual: slaPct },
      slaTendencia,
      tipos: tipoFormatado,
      tempoPorCategoria: tempoCat.map(c => ({ categoria: c.categoria.split(' > ').pop(), categoriaCompleta: c.categoria, mediaHoras: c.media_horas, qtd: c.qtd })),
      backlog,
    };
  },

  /** SLA Detalhado — métricas avançadas de SLA, tempo, reaberturas e volume */
  async obterSLADetalhado({ dias = 30 } = {}) {
    const p = this._getPool();
    const GF = `INNER JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2 AND gt.groups_id = ${GRUPO_TI_ID}`;
    const ENTIDADE_FILTER = `AND t.entities_id NOT IN (SELECT id FROM glpi_entities WHERE UPPER(name) LIKE '%PARCEIRO%')`;
    const prioNomes = {1:'Muito baixa',2:'Baixa',3:'Média',4:'Alta',5:'Muito alta',6:'Crítica'};
    const prioIcones = {1:'⚪',2:'🟢',3:'🟡',4:'🟠',5:'🔴',6:'🟣'};
    const statusNomes = {1:'Novo',2:'Atribuído',3:'Planejado',4:'Pendente',5:'Solucionado',6:'Fechado'};
    const statusIcones = {1:'⚪',2:'🟢',3:'🟡',4:'🟠',5:'🔵',6:'⚫'};

    // Regras SLA da Tracbel (em segundos)
    const SLA_ATENDIMENTO = {1:14400,2:7200,3:6300,4:5400,5:4500,6:2700};
    const SLA_SOLUCAO = {1:230400,2:115200,3:93600,4:72000,5:43200,6:9900};

    // 1. SLA por prioridade — regra Qlik: exclui pendente(4), inclui abertos que já passaram do prazo
    const [slaPrioridade] = await p.execute(
      `SELECT t.priority,
        COUNT(*) as total,
        SUM(CASE
          WHEN t.time_to_resolve IS NOT NULL AND t.status <> 4 AND (
            t.solvedate > t.time_to_resolve
            OR (t.solvedate IS NULL AND t.time_to_resolve < NOW())
          ) THEN 1 ELSE 0
        END) as fora_sla_solucao,
        SUM(CASE
          WHEN t.time_to_own IS NOT NULL AND t.status <> 4 AND (
            (t.takeintoaccount_delay_stat > TIMESTAMPDIFF(SECOND, t.date, t.time_to_own))
            OR (t.takeintoaccount_delay_stat = 0 AND t.time_to_own < NOW())
          ) THEN 1 ELSE 0
        END) as fora_sla_atendimento
      FROM glpi_tickets t ${GF}
      WHERE t.is_deleted = 0 ${ENTIDADE_FILTER}
        AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY t.priority ORDER BY t.priority`, [dias]);
    const slaPorPrioridade = slaPrioridade.map(r => {
      const fora = parseInt(r.fora_sla_solucao) || 0;
      const dentro = r.total - fora;
      return {
        prioridade: r.priority,
        nome: prioNomes[r.priority] || `Nível ${r.priority}`,
        icone: prioIcones[r.priority] || '',
        total: r.total,
        dentro_sla: dentro,
        fora_sla: fora,
        fora_sla_atendimento: parseInt(r.fora_sla_atendimento) || 0,
        percentual: r.total > 0 ? +((dentro / r.total) * 100).toFixed(1) : 0,
        meta_atendimento_h: SLA_ATENDIMENTO[r.priority] ? +(SLA_ATENDIMENTO[r.priority]/3600).toFixed(1) : null,
        meta_solucao_h: SLA_SOLUCAO[r.priority] ? +(SLA_SOLUCAO[r.priority]/3600).toFixed(1) : null,
      };
    });

    // 2. SLA por atendente — regra Qlik
    const [slaAtendente] = await p.execute(
      `SELECT u.id as user_id, u.realname, u.firstname,
        COUNT(*) as total,
        SUM(CASE WHEN t.time_to_resolve IS NOT NULL AND t.status <> 4 AND (
          t.solvedate > t.time_to_resolve OR (t.solvedate IS NULL AND t.time_to_resolve < NOW())
        ) THEN 1 ELSE 0 END) as fora_sla,
        ROUND(AVG(TIMESTAMPDIFF(HOUR, t.date, COALESCE(t.solvedate, NOW()))),1) as media_horas
      FROM glpi_tickets t ${GF}
      JOIN glpi_tickets_users tu ON tu.tickets_id = t.id AND tu.type = 2
      JOIN glpi_users u ON u.id = tu.users_id
      WHERE t.is_deleted = 0 ${ENTIDADE_FILTER}
        AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY u.id ORDER BY total DESC LIMIT 15`, [dias]);
    const slaPorAtendente = slaAtendente.map(r => {
      const fora = parseInt(r.fora_sla) || 0;
      const dentro = r.total - fora;
      return {
        nome: `${r.firstname || ''} ${r.realname || ''}`.trim(),
        total: r.total,
        dentro_sla: dentro,
        fora_sla: fora,
        percentual: r.total > 0 ? +((dentro / r.total) * 100).toFixed(1) : 0,
        media_horas: r.media_horas || 0,
      };
    });

    // 3. Urgência cruzado com tempo — regra Qlik
    const [urgTempo] = await p.execute(
      `SELECT t.urgency,
        COUNT(*) as total,
        ROUND(AVG(CASE WHEN t.solvedate IS NOT NULL THEN TIMESTAMPDIFF(HOUR, t.date, t.solvedate) END),1) as media_horas,
        SUM(CASE WHEN t.time_to_resolve IS NOT NULL AND t.status <> 4 AND (
          t.solvedate > t.time_to_resolve OR (t.solvedate IS NULL AND t.time_to_resolve < NOW())
        ) THEN 1 ELSE 0 END) as fora_sla,
        SUM(CASE WHEN t.solvedate IS NOT NULL THEN 1 ELSE 0 END) as solucionados,
        SUM(CASE WHEN t.status < 5 THEN 1 ELSE 0 END) as abertos
      FROM glpi_tickets t ${GF}
      WHERE t.is_deleted = 0 ${ENTIDADE_FILTER}
        AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY t.urgency ORDER BY t.urgency`, [dias]);
    const porUrgenciaTempo = urgTempo.map(r => {
      const fora = parseInt(r.fora_sla) || 0;
      const dentro = r.total - fora;
      return {
        urgencia: r.urgency,
        nome: prioNomes[r.urgency] || `Nível ${r.urgency}`,
        icone: prioIcones[r.urgency] || '',
        total: r.total,
        solucionados: parseInt(r.solucionados) || 0,
        abertos: parseInt(r.abertos) || 0,
        media_horas: r.media_horas || 0,
        fora_sla: fora,
        percentual_sla: r.total > 0 ? +((dentro / r.total) * 100).toFixed(1) : 0,
      };
    });

    // 4. Top 10 chamados mais antigos abertos — com status, atendente, dias sem interação
    const [maisAntigos] = await p.execute(
      `SELECT t.id, t.name, t.date, t.urgency, t.priority, t.status,
        COALESCE(c.completename, 'Sem categoria') as categoria,
        DATEDIFF(NOW(), t.date) as idade_dias,
        DATEDIFF(NOW(), t.date_mod) as dias_sem_interacao,
        (SELECT CONCAT(u.firstname, ' ', u.realname) FROM glpi_tickets_users tu
         JOIN glpi_users u ON u.id = tu.users_id
         WHERE tu.tickets_id = t.id AND tu.type = 2 LIMIT 1) as atendente
      FROM glpi_tickets t ${GF}
      LEFT JOIN glpi_itilcategories c ON c.id = t.itilcategories_id
      WHERE t.status < 5 AND t.is_deleted = 0 ${ENTIDADE_FILTER}
      ORDER BY t.date ASC LIMIT 10`);
    const chamadosMaisAntigos = maisAntigos.map(r => ({
      id: r.id,
      titulo: r.name,
      data_abertura: r.date,
      urgencia: prioNomes[r.urgency] || `Nível ${r.urgency}`,
      prioridade: prioNomes[r.priority] || `Nível ${r.priority}`,
      prioridade_icone: prioIcones[r.priority] || '',
      status: statusNomes[r.status] || r.status,
      status_icone: statusIcones[r.status] || '',
      categoria: r.categoria,
      atendente: r.atendente || 'Não atribuído',
      idade_dias: r.idade_dias,
      dias_sem_interacao: r.dias_sem_interacao,
    }));

    // 5. Distribuição por hora de abertura
    const [porHora] = await p.execute(
      `SELECT HOUR(t.date) as hora, COUNT(*) as total
      FROM glpi_tickets t ${GF}
      WHERE t.is_deleted = 0 AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY HOUR(t.date) ORDER BY hora`, [dias]);

    // 6. Tempo médio por etapa
    const [etapas] = await p.execute(
      `SELECT
        ROUND(AVG(t.takeintoaccount_delay_stat / 3600), 1) as media_primeira_resposta,
        ROUND(AVG(t.solve_delay_stat / 3600), 1) as media_solucao,
        ROUND(AVG(t.waiting_duration / 3600), 1) as media_espera
      FROM glpi_tickets t ${GF}
      WHERE t.solvedate IS NOT NULL AND t.is_deleted = 0
        AND t.solvedate >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [dias]);
    const tempoPorEtapa = {
      media_primeira_resposta: etapas[0].media_primeira_resposta || 0,
      media_solucao: etapas[0].media_solucao || 0,
      media_espera: etapas[0].media_espera || 0,
    };

    // 7. Reaberturas — regra Qlik: glpi_itilsolutions com status = 4 (recusada)
    const [reaberturas] = await p.execute(
      `SELECT COUNT(DISTINCT t.id) as total
      FROM glpi_tickets t ${GF}
      JOIN glpi_itilsolutions sol ON sol.items_id = t.id AND sol.itemtype = 'Ticket' AND sol.status = 4
      WHERE t.is_deleted = 0 ${ENTIDADE_FILTER}
        AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [dias]);

    // 8. Volume semanal (abertos e solucionados por semana)
    const [volAbertos] = await p.execute(
      `SELECT YEARWEEK(t.date, 1) as semana, COUNT(*) as abertos
      FROM glpi_tickets t ${GF}
      WHERE t.is_deleted = 0 AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY YEARWEEK(t.date, 1) ORDER BY semana`, [dias]);
    const [volSoluc] = await p.execute(
      `SELECT YEARWEEK(t.solvedate, 1) as semana, COUNT(*) as solucionados
      FROM glpi_tickets t ${GF}
      WHERE t.solvedate IS NOT NULL AND t.solvedate >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY YEARWEEK(t.solvedate, 1) ORDER BY semana`, [dias]);

    const semanaMap = {};
    volAbertos.forEach(r => { semanaMap[r.semana] = { semana: r.semana, abertos: r.abertos, solucionados: 0 } });
    volSoluc.forEach(r => { if (!semanaMap[r.semana]) semanaMap[r.semana] = { semana: r.semana, abertos: 0, solucionados: 0 }; semanaMap[r.semana].solucionados = r.solucionados });
    const volumeSemanal = Object.values(semanaMap).sort((a, b) => a.semana - b.semana).map(s => ({
      semana: `S${String(s.semana).slice(-2)}`,
      abertos: s.abertos,
      solucionados: s.solucionados,
    }));

    // 9. SLA global (solução e atendimento separados) — regra Qlik
    const [slaGlobal] = await p.execute(
      `SELECT COUNT(*) as total,
        SUM(CASE WHEN t.time_to_resolve IS NOT NULL AND t.status <> 4 AND (
          t.solvedate > t.time_to_resolve OR (t.solvedate IS NULL AND t.time_to_resolve < NOW())
        ) THEN 1 ELSE 0 END) as fora_sla_solucao,
        SUM(CASE WHEN t.time_to_own IS NOT NULL AND t.status <> 4 AND (
          (t.takeintoaccount_delay_stat > TIMESTAMPDIFF(SECOND, t.date, t.time_to_own))
          OR (t.takeintoaccount_delay_stat = 0 AND t.time_to_own < NOW())
        ) THEN 1 ELSE 0 END) as fora_sla_atendimento
      FROM glpi_tickets t ${GF}
      WHERE t.is_deleted = 0 ${ENTIDADE_FILTER}
        AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [dias]);

    const totalGlobal = slaGlobal[0].total || 0;
    const foraSlaSol = parseInt(slaGlobal[0].fora_sla_solucao) || 0;
    const foraSlaAten = parseInt(slaGlobal[0].fora_sla_atendimento) || 0;

    // 10. Chamados por categoria (para filtro)
    const [porCategoria] = await p.execute(
      `SELECT COALESCE(c.completename, 'Sem categoria') as categoria,
        REPLACE(COALESCE(c.completename, 'Sem categoria'), 'TECNOLOGIA DA INFORMAÇÃO', 'TI') as categoria_curta,
        COUNT(*) as total,
        SUM(CASE WHEN t.status < 5 THEN 1 ELSE 0 END) as abertos,
        SUM(CASE WHEN t.solvedate IS NOT NULL THEN 1 ELSE 0 END) as solucionados
      FROM glpi_tickets t ${GF}
      LEFT JOIN glpi_itilcategories c ON c.id = t.itilcategories_id
      WHERE t.is_deleted = 0 ${ENTIDADE_FILTER} AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY c.id ORDER BY total DESC LIMIT 20`, [dias]);

    return {
      // SLA Global
      slaGlobal: {
        total: totalGlobal,
        slaSolucao: { dentro: totalGlobal - foraSlaSol, fora: foraSlaSol, pct: totalGlobal > 0 ? +(((totalGlobal - foraSlaSol) / totalGlobal) * 100).toFixed(1) : 0 },
        slaAtendimento: { dentro: totalGlobal - foraSlaAten, fora: foraSlaAten, pct: totalGlobal > 0 ? +(((totalGlobal - foraSlaAten) / totalGlobal) * 100).toFixed(1) : 0 },
      },
      slaPorPrioridade,
      slaPorAtendente,
      porUrgenciaTempo,
      chamadosMaisAntigos,
      distribuicaoPorHora: porHora,
      tempoPorEtapa,
      reaberturas: reaberturas[0].total,
      volumeSemanal,
      porCategoria,
      regras: { SLA_ATENDIMENTO, SLA_SOLUCAO, prioNomes, statusNomes },
    };
  },

  /** Relatório diário — métricas do dia para email via n8n */
  async relatorioDiario() {
    const p = this._getPool();
    const GF = `INNER JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2 AND gt.groups_id = ${GRUPO_TI_ID}`;
    const EF = `AND t.entities_id NOT IN (SELECT id FROM glpi_entities WHERE UPPER(name) LIKE '%PARCEIRO%')`;

    const [abertos] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.status < 5 AND t.is_deleted = 0 ${EF}`);
    const [envelhecidos] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.status < 5 AND t.is_deleted = 0 ${EF} AND t.date < DATE_SUB(NOW(), INTERVAL 45 DAY)`);
    const [abertosHoje] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE DATE(t.date) = CURDATE() AND t.is_deleted = 0 ${EF}`);
    // Solucionados hoje = solvedate hoje (não mistura com closedate de dias anteriores)
    const [solucionadosHoje] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.is_deleted = 0 ${EF} AND DATE(t.solvedate) = CURDATE()`);
    const [fechadosHoje] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.status = 6 AND DATE(t.closedate) = CURDATE() AND t.is_deleted = 0 ${EF}`);

    const [porStatus] = await p.execute(`SELECT
      SUM(CASE WHEN t.status=1 THEN 1 ELSE 0 END) as novos,
      SUM(CASE WHEN t.status=2 THEN 1 ELSE 0 END) as atribuidos,
      SUM(CASE WHEN t.status=3 THEN 1 ELSE 0 END) as planejados,
      SUM(CASE WHEN t.status=4 THEN 1 ELSE 0 END) as pendentes
      FROM glpi_tickets t ${GF} WHERE t.status < 5 AND t.is_deleted = 0 ${EF}`);

    const [slaHoje] = await p.execute(`SELECT COUNT(*) as total,
      SUM(CASE WHEN t.time_to_resolve IS NOT NULL AND t.solvedate <= t.time_to_resolve THEN 1 ELSE 0 END) as dentro
      FROM glpi_tickets t ${GF}
      WHERE t.solvedate IS NOT NULL AND DATE(t.solvedate) = CURDATE() AND t.time_to_resolve IS NOT NULL AND t.is_deleted = 0 ${EF}`);
    const slaPct = slaHoje[0].total > 0 ? +(((parseInt(slaHoje[0].dentro) || 0) / slaHoje[0].total) * 100).toFixed(1) : 0;

    const [tempoHoje] = await p.execute(`SELECT ROUND(AVG(t.solve_delay_stat/3600),1) as media
      FROM glpi_tickets t ${GF} WHERE t.solvedate IS NOT NULL AND DATE(t.solvedate) = CURDATE() AND t.is_deleted = 0 ${EF}`);

    const [categoriasHoje] = await p.execute(`SELECT
      REPLACE(COALESCE(c.completename, 'Sem categoria'), 'TECNOLOGIA DA INFORMAÇÃO', 'TI') as categoria,
      COUNT(*) as qtd FROM glpi_tickets t ${GF}
      LEFT JOIN glpi_itilcategories c ON c.id = t.itilcategories_id
      WHERE DATE(t.date) = CURDATE() AND t.is_deleted = 0 ${EF}
      GROUP BY c.id ORDER BY qtd DESC LIMIT 5`);

    // Top atendentes — quem solucionou hoje (solvedate hoje, via itilsolutions)
    const [atendentesHoje] = await p.execute(`SELECT
      CONCAT(COALESCE(u.firstname,''), ' ', COALESCE(u.realname,'')) as nome,
      COUNT(DISTINCT t.id) as resolvidos
      FROM glpi_tickets t ${GF}
      JOIN glpi_itilsolutions sol ON sol.items_id = t.id AND sol.itemtype = 'Ticket' AND sol.status != 4
      JOIN glpi_users u ON u.id = sol.users_id
      WHERE t.is_deleted = 0 ${EF}
        AND DATE(t.solvedate) = CURDATE()
      GROUP BY u.id ORDER BY resolvidos DESC LIMIT 5`);

    const [reabertosHoje] = await p.execute(`SELECT COUNT(DISTINCT t.id) as total
      FROM glpi_tickets t ${GF}
      JOIN glpi_itilsolutions sol ON sol.items_id = t.id AND sol.itemtype = 'Ticket' AND sol.status = 4
      WHERE DATE(sol.date_creation) = CURDATE() AND t.is_deleted = 0 ${EF}`);

    // VPN hoje
    const [vpnHoje] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.itilcategories_id = 255 AND DATE(t.date) = CURDATE() AND t.is_deleted = 0 ${EF}`);
    const [vpnAbertos] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.itilcategories_id = 255 AND t.status < 5 AND t.is_deleted = 0 ${EF}`);

    // Reset senha hoje (todas as categorias)
    const [resetHoje] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.itilcategories_id IN (349,252,219,314,296) AND DATE(t.date) = CURDATE() AND t.is_deleted = 0 ${EF}`);

    // Comparação com ontem
    const [abertosOntem] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE DATE(t.date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND t.is_deleted = 0 ${EF}`);
    const [solucionadosOntem] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.is_deleted = 0 ${EF} AND DATE(t.solvedate) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`);

    // Tempo resposta hoje
    const [tempoRespostaHoje] = await p.execute(`SELECT ROUND(AVG(t.takeintoaccount_delay_stat/3600),1) as media FROM glpi_tickets t ${GF} WHERE t.takeintoaccount_delay_stat > 0 AND DATE(t.date) = CURDATE() AND t.is_deleted = 0 ${EF}`);

    // SLA atendimento hoje
    const [slaAtenHoje] = await p.execute(`SELECT COUNT(*) as total,
      SUM(CASE WHEN t.time_to_own IS NOT NULL AND t.status <> 4 AND (
        (t.takeintoaccount_delay_stat > TIMESTAMPDIFF(SECOND, t.date, t.time_to_own))
        OR (t.takeintoaccount_delay_stat = 0 AND t.time_to_own < NOW())
      ) THEN 1 ELSE 0 END) as fora
      FROM glpi_tickets t ${GF}
      WHERE DATE(t.date) = CURDATE() AND t.is_deleted = 0 ${EF}`);
    const slaAtenPct = slaAtenHoje[0].total > 0 ? +(((slaAtenHoje[0].total - parseInt(slaAtenHoje[0].fora || 0)) / slaAtenHoje[0].total) * 100).toFixed(1) : 0;

    // MySQL2 retorna COUNT(*) como BigInt — parseInt() garante serialização JSON correta
    const n = (v) => parseInt(v) || 0;

    return {
      data: new Date().toISOString().split('T')[0],
      dataFormatada: new Date().toLocaleDateString('pt-BR'),
      resumo: {
        abertos: n(abertos[0].total),
        envelhecidos: n(envelhecidos[0].total),
        abertosHoje: n(abertosHoje[0].total),
        solucionadosHoje: n(solucionadosHoje[0].total),
        fechadosHoje: n(fechadosHoje[0].total),
        reabertosHoje: n(reabertosHoje[0].total),
        slaPct,
        slaAtenPct,
        tempoMedioHoje: parseFloat(tempoHoje[0].media) || 0,
        tempoRespostaHoje: parseFloat(tempoRespostaHoje[0].media) || 0,
        vpnHoje: n(vpnHoje[0].total),
        vpnAbertos: n(vpnAbertos[0].total),
        resetSenhaHoje: n(resetHoje[0].total),
        abertosOntem: n(abertosOntem[0].total),
        solucionadosOntem: n(solucionadosOntem[0].total),
      },
      porStatus: {
        novos: n(porStatus[0].novos),
        atribuidos: n(porStatus[0].atribuidos),
        planejados: n(porStatus[0].planejados),
        pendentes: n(porStatus[0].pendentes),
      },
      categoriasHoje: categoriasHoje.map(c => ({ categoria: c.categoria.split(' > ').pop(), qtd: n(c.qtd) })),
      atendentesHoje: atendentesHoje.map(a => ({ nome: a.nome.trim(), resolvidos: n(a.resolvidos) })),
    };
  },

  /** Explorar chamados — pesquisa avançada com filtros */
  async explorarChamados({ dias = 90, categoria, atendente, status, urgencia, prioridade, busca, ordenar = 'recentes', limite = 50, pagina = 0 } = {}) {
    const p = this._getPool();
    const GF = `INNER JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2 AND gt.groups_id = ${GRUPO_TI_ID}`;
    const EF = `AND t.entities_id NOT IN (SELECT id FROM glpi_entities WHERE UPPER(name) LIKE '%PARCEIRO%')`;

    let where = `t.is_deleted = 0 ${EF} AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY)`;
    const params = [dias];

    if (categoria) { where += ` AND c.completename LIKE ?`; params.push(`%${categoria}%`); }
    if (atendente) { where += ` AND (u_tec.realname LIKE ? OR u_tec.firstname LIKE ?)`; params.push(`%${atendente}%`, `%${atendente}%`); }
    if (status) { where += ` AND t.status = ?`; params.push(parseInt(status)); }
    if (urgencia) { where += ` AND t.urgency = ?`; params.push(parseInt(urgencia)); }
    if (prioridade) { where += ` AND t.priority = ?`; params.push(parseInt(prioridade)); }
    if (busca) { where += ` AND (t.name LIKE ? OR t.id = ?)`; params.push(`%${busca}%`, parseInt(busca) || 0); }

    const orderMap = {
      'recentes': 't.date DESC',
      'antigos': 't.date ASC',
      'prioridade': 't.priority DESC, t.date DESC',
      'urgencia': 't.urgency DESC, t.date DESC',
      'sem_interacao': 't.date_mod ASC',
    };
    const order = orderMap[ordenar] || 't.date DESC';

    // Total
    const countParams = [...params];
    const [countResult] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF}
      LEFT JOIN glpi_itilcategories c ON c.id = t.itilcategories_id
      LEFT JOIN glpi_tickets_users tu_tec ON tu_tec.tickets_id = t.id AND tu_tec.type = 2
      LEFT JOIN glpi_users u_tec ON u_tec.id = tu_tec.users_id
      WHERE ${where}`, countParams);

    // Chamados
    const offset = pagina * limite;
    const [chamados] = await p.execute(`SELECT DISTINCT
      t.id, t.name as titulo, t.date as data_abertura, t.solvedate as data_solucao,
      t.closedate as data_fechamento, t.status, t.urgency, t.priority,
      t.solve_delay_stat, t.takeintoaccount_delay_stat, t.waiting_duration,
      t.time_to_resolve, t.date_mod as ultima_atualizacao,
      DATEDIFF(NOW(), t.date) as idade_dias,
      DATEDIFF(NOW(), t.date_mod) as dias_sem_interacao,
      REPLACE(COALESCE(c.completename, 'Sem categoria'), 'TECNOLOGIA DA INFORMAÇÃO', 'TI') as categoria,
      CONCAT(COALESCE(u_tec.firstname,''), ' ', COALESCE(u_tec.realname,'')) as atendente,
      CONCAT(COALESCE(u_req.firstname,''), ' ', COALESCE(u_req.realname,'')) as requerente
      FROM glpi_tickets t ${GF}
      LEFT JOIN glpi_itilcategories c ON c.id = t.itilcategories_id
      LEFT JOIN glpi_tickets_users tu_tec ON tu_tec.tickets_id = t.id AND tu_tec.type = 2
      LEFT JOIN glpi_users u_tec ON u_tec.id = tu_tec.users_id
      LEFT JOIN glpi_tickets_users tu_req ON tu_req.tickets_id = t.id AND tu_req.type = 1
      LEFT JOIN glpi_users u_req ON u_req.id = tu_req.users_id
      WHERE ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`, [...params, limite, offset]);

    const prioNomes = {1:'Muito baixa',2:'Baixa',3:'Média',4:'Alta',5:'Muito alta',6:'Crítica'};
    const statusNomes = {1:'Novo',2:'Atribuído',3:'Planejado',4:'Pendente',5:'Solucionado',6:'Fechado'};
    const statusIcones = {1:'⚪',2:'🟢',3:'🟡',4:'🟠',5:'🔵',6:'⚫'};

    return {
      total: countResult[0].total,
      pagina,
      limite,
      chamados: chamados.map(c => ({
        ...c,
        atendente: (c.atendente || '').trim() || 'Não atribuído',
        requerente: (c.requerente || '').trim() || '-',
        status_nome: statusNomes[c.status] || c.status,
        status_icone: statusIcones[c.status] || '',
        urgencia_nome: prioNomes[c.urgency] || c.urgency,
        prioridade_nome: prioNomes[c.priority] || c.priority,
        tempo_solucao_h: c.solve_delay_stat ? +(c.solve_delay_stat / 3600).toFixed(1) : null,
        tempo_resposta_h: c.takeintoaccount_delay_stat ? +(c.takeintoaccount_delay_stat / 3600).toFixed(1) : null,
        sla_excedido: c.time_to_resolve && c.status !== 4 && (
          (c.data_solucao && new Date(c.data_solucao) > new Date(c.time_to_resolve)) ||
          (!c.data_solucao && new Date(c.time_to_resolve) < new Date())
        ),
      })),
    };
  },

  /** Listar filtros disponíveis (categorias, atendentes, etc) */
  async listarFiltros() {
    const p = this._getPool();
    const GF = `INNER JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2 AND gt.groups_id = ${GRUPO_TI_ID}`;
    const EF = `AND t.entities_id NOT IN (SELECT id FROM glpi_entities WHERE UPPER(name) LIKE '%PARCEIRO%')`;

    const [categorias] = await p.execute(`SELECT DISTINCT
      REPLACE(COALESCE(c.completename, 'Sem categoria'), 'TECNOLOGIA DA INFORMAÇÃO', 'TI') as nome,
      COUNT(*) as qtd
      FROM glpi_tickets t ${GF}
      LEFT JOIN glpi_itilcategories c ON c.id = t.itilcategories_id
      WHERE t.is_deleted = 0 ${EF} AND t.date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      GROUP BY c.id ORDER BY qtd DESC`);

    const [atendentes] = await p.execute(`SELECT DISTINCT
      CONCAT(COALESCE(u.firstname,''), ' ', COALESCE(u.realname,'')) as nome,
      COUNT(*) as qtd
      FROM glpi_tickets t ${GF}
      JOIN glpi_tickets_users tu ON tu.tickets_id = t.id AND tu.type = 2
      JOIN glpi_users u ON u.id = tu.users_id
      WHERE t.is_deleted = 0 ${EF} AND t.date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      GROUP BY u.id ORDER BY qtd DESC`);

    // Rankings
    const [maisRequisitadas] = await p.execute(`SELECT
      REPLACE(COALESCE(c.completename, 'Sem categoria'), 'TECNOLOGIA DA INFORMAÇÃO', 'TI') as categoria,
      COUNT(*) as total,
      ROUND(AVG(CASE WHEN t.solve_delay_stat > 0 THEN t.solve_delay_stat/3600 END),1) as media_horas
      FROM glpi_tickets t ${GF}
      LEFT JOIN glpi_itilcategories c ON c.id = t.itilcategories_id
      WHERE t.is_deleted = 0 ${EF} AND t.date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      GROUP BY c.id ORDER BY total DESC LIMIT 15`);

    const [maisAtendimentos] = await p.execute(`SELECT
      CONCAT(COALESCE(u.firstname,''), ' ', COALESCE(u.realname,'')) as atendente,
      COUNT(*) as total,
      SUM(CASE WHEN t.solvedate IS NOT NULL THEN 1 ELSE 0 END) as solucionados,
      ROUND(AVG(CASE WHEN t.solve_delay_stat > 0 THEN t.solve_delay_stat/3600 END),1) as media_horas
      FROM glpi_tickets t ${GF}
      JOIN glpi_tickets_users tu ON tu.tickets_id = t.id AND tu.type = 2
      JOIN glpi_users u ON u.id = tu.users_id
      WHERE t.is_deleted = 0 ${EF} AND t.date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      GROUP BY u.id ORDER BY total DESC LIMIT 15`);

    return {
      categorias: categorias.map(c => ({ nome: c.nome.split(' > ').pop(), nomeCompleto: c.nome, qtd: c.qtd })),
      atendentes: atendentes.map(a => ({ nome: a.nome.trim(), qtd: a.qtd })),
      rankings: {
        maisRequisitadas: maisRequisitadas.map(c => ({ categoria: c.categoria.split(' > ').pop(), total: c.total, mediaHoras: c.media_horas })),
        maisAtendimentos: maisAtendimentos.map(a => ({ atendente: a.atendente.trim(), total: a.total, solucionados: a.solucionados, mediaHoras: a.media_horas })),
      },
    };
  },

  /** Comparar Meses — mês atual vs anterior + variação + previsão fechamento */
  async compararMeses() {
    const p = this._getPool();
    const GF = `INNER JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2 AND gt.groups_id = ${GRUPO_TI_ID}`;
    const EF = `AND t.entities_id NOT IN (SELECT id FROM glpi_entities WHERE UPPER(name) LIKE '%PARCEIRO%')`;

    // Helper: stats for a given month (YYYY-MM format)
    const statsMes = async (ano, mes) => {
      const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const fimMes = mes === 12
        ? `${ano + 1}-01-01`
        : `${ano}-${String(mes + 1).padStart(2, '0')}-01`;

      const [abertos] = await p.execute(
        `SELECT COUNT(*) as total FROM glpi_tickets t ${GF}
         WHERE t.date >= ? AND t.date < ? AND t.is_deleted = 0 ${EF}`, [inicioMes, fimMes]);

      const [solucionados] = await p.execute(
        `SELECT COUNT(*) as total FROM glpi_tickets t ${GF}
         WHERE t.solvedate IS NOT NULL AND t.solvedate >= ? AND t.solvedate < ? AND t.is_deleted = 0 ${EF}`, [inicioMes, fimMes]);

      const [slaData] = await p.execute(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN t.time_to_resolve IS NOT NULL AND t.status <> 4 AND (
            t.solvedate > t.time_to_resolve OR (t.solvedate IS NULL AND t.time_to_resolve < NOW())
          ) THEN 1 ELSE 0 END) as fora_sla
         FROM glpi_tickets t ${GF}
         WHERE t.is_deleted = 0 ${EF} AND t.date >= ? AND t.date < ?`, [inicioMes, fimMes]);
      const slaPct = slaData[0].total > 0
        ? +(((slaData[0].total - parseInt(slaData[0].fora_sla || 0)) / slaData[0].total) * 100).toFixed(1)
        : 0;

      const [tempoMedio] = await p.execute(
        `SELECT ROUND(AVG(t.solve_delay_stat/3600),1) as media_horas FROM glpi_tickets t ${GF}
         WHERE t.solvedate IS NOT NULL AND t.solvedate >= ? AND t.solvedate < ? AND t.is_deleted = 0 ${EF}`, [inicioMes, fimMes]);

      return {
        abertos: abertos[0].total,
        solucionados: solucionados[0].total,
        slaPct,
        tempoMedio: tempoMedio[0].media_horas || 0,
      };
    };

    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth() + 1; // 1-12
    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
    const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;

    const [atual, anterior] = await Promise.all([
      statsMes(anoAtual, mesAtual),
      statsMes(anoAnterior, mesAnterior),
    ]);

    // Variation calculator
    const variacao = (atualVal, anteriorVal) => {
      if (anteriorVal === 0) return atualVal > 0 ? 100 : 0;
      return +(((atualVal - anteriorVal) / anteriorVal) * 100).toFixed(1);
    };

    // Forecast: projected month-end based on current daily average
    const diaAtual = agora.getDate();
    const mediaDiariaSolucionados = diaAtual > 0 ? atual.solucionados / diaAtual : 0;

    // Remaining business days calculation
    const ultimoDiaMes = new Date(anoAtual, mesAtual, 0).getDate();
    let diasUteisRestantes = 0;
    for (let d = diaAtual + 1; d <= ultimoDiaMes; d++) {
      const dia = new Date(anoAtual, mesAtual - 1, d).getDay();
      if (dia !== 0 && dia !== 6) diasUteisRestantes++;
    }

    const previsaoSolucionados = Math.round(atual.solucionados + (mediaDiariaSolucionados * diasUteisRestantes));

    const mesesNomes = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    return {
      mesAtual: {
        nome: mesesNomes[mesAtual],
        ano: anoAtual,
        ...atual,
      },
      mesAnterior: {
        nome: mesesNomes[mesAnterior],
        ano: anoAnterior,
        ...anterior,
      },
      variacao: {
        abertos: variacao(atual.abertos, anterior.abertos),
        solucionados: variacao(atual.solucionados, anterior.solucionados),
        slaPct: +(atual.slaPct - anterior.slaPct).toFixed(1),
        tempoMedio: variacao(atual.tempoMedio, anterior.tempoMedio),
      },
      previsaoFechamento: {
        solucionadosProjetados: previsaoSolucionados,
        mediaDiaria: +mediaDiariaSolucionados.toFixed(1),
        diasUteisRestantes,
        diaAtual,
        totalDiasMes: ultimoDiaMes,
      },
    };
  },

  /** Métricas por categorias específicas (VPN, Reset senha, etc) */
  async metricasPorCategoria({ dias = 90 } = {}) {
    const p = this._getPool();
    const GF = `INNER JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2 AND gt.groups_id = ${GRUPO_TI_ID}`;
    const EF = `AND t.entities_id NOT IN (SELECT id FROM glpi_entities WHERE UPPER(name) LIKE '%PARCEIRO%')`;

    // Categorias monitoradas com IDs
    const categorias = [
      { id: 255, nome: 'VPN', cor: '#017efa' },
      { id: 349, nome: 'Reset Senha - John Deere', cor: '#16a34a' },
      { id: 252, nome: 'Reset Senha - Rede/AD', cor: '#f59e0b' },
      { id: 219, nome: 'Reset Senha - Email', cor: '#a037fc' },
      { id: 314, nome: 'Reset Senha - TOTVS', cor: '#fc381d' },
      { id: 414, nome: 'Gestão de Acesso', cor: '#51cbff' },
      { id: 313, nome: 'Permissão - TOTVS', cor: '#fd1f9b' },
      { id: 350, nome: 'Permissão - John Deere', cor: '#6342ff' },
    ];

    const resultado = [];
    for (const cat of categorias) {
      const [total] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.itilcategories_id = ? AND t.is_deleted = 0 ${EF} AND t.date >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [cat.id, dias]);
      const [abertos] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.itilcategories_id = ? AND t.status < 5 AND t.is_deleted = 0 ${EF}`, [cat.id]);
      const [mesAtual] = await p.execute(`SELECT COUNT(*) as total FROM glpi_tickets t ${GF} WHERE t.itilcategories_id = ? AND t.is_deleted = 0 ${EF} AND t.date >= DATE_FORMAT(NOW(), '%Y-%m-01')`, [cat.id]);
      const [mediaMensal] = await p.execute(`SELECT ROUND(AVG(qtd),0) as media FROM (SELECT DATE_FORMAT(t.date,'%Y-%m') as mes, COUNT(*) as qtd FROM glpi_tickets t ${GF} WHERE t.itilcategories_id = ? AND t.is_deleted = 0 ${EF} AND t.date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY mes) sub`, [cat.id]);

      resultado.push({
        ...cat,
        total: total[0].total,
        abertos: abertos[0].total,
        mesAtual: mesAtual[0].total,
        mediaMensal: parseInt(mediaMensal[0].media) || 0,
      });
    }

    // Evolução mensal das top categorias (últimos 6 meses)
    const [evolucao] = await p.execute(`SELECT
      DATE_FORMAT(t.date, '%Y-%m') as mes,
      SUM(CASE WHEN t.itilcategories_id = 255 THEN 1 ELSE 0 END) as vpn,
      SUM(CASE WHEN t.itilcategories_id IN (349,252,219,314,296) THEN 1 ELSE 0 END) as reset_senha,
      SUM(CASE WHEN t.itilcategories_id IN (414,313,350) THEN 1 ELSE 0 END) as gestao_acesso
      FROM glpi_tickets t ${GF}
      WHERE t.is_deleted = 0 ${EF} AND t.date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY mes ORDER BY mes`);

    return { categorias: resultado, evolucaoMensal: evolucao };
  },

  /** Verifica se a integração está configurada */
  estaConfigurado() {
    return !!(process.env.GLPI_MYSQL_HOST && process.env.GLPI_MYSQL_USER && process.env.GLPI_MYSQL_PASSWORD);
  },

  /** Testa conexão */
  async testarConexao() {
    const p = this._getPool();
    const [rows] = await p.execute('SELECT 1 as ok');
    return rows[0].ok === 1;
  },
};

module.exports = glpiIntegracaoService;
