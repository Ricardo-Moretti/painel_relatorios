/**
 * Service do Dashboard
 * Cálculos de métricas, scores, tendências e alertas
 */
const rotinaRepository = require('../repositories/rotinaRepository');
const glpiRepository = require('../repositories/glpiRepository');

const dashboardService = {
  /**
   * Retorna dados completos do dashboard
   * Cards, gráficos, tabela analítica e alertas
   */
  obterDados({ dataInicio, dataFim, dias = 30 }) {
    // Define período padrão se não informado
    if (!dataInicio) {
      const d = new Date();
      d.setDate(d.getDate() - dias);
      dataInicio = d.toISOString().split('T')[0];
    }
    if (!dataFim) {
      dataFim = new Date().toISOString().split('T')[0];
    }

    // Coleta dados brutos
    const contagem = rotinaRepository.contarPorStatus({ dataInicio, dataFim });
    const temporais = rotinaRepository.dadosTemporais(dias);
    const performance = rotinaRepository.performancePorRotina({ dataInicio, dataFim });
    const ultimasExecucoes = rotinaRepository.buscarUltimasExecucoes();

    // Calcula totais
    const totais = { sucesso: 0, erro: 0, parcial: 0 };
    contagem.forEach(c => {
      if (c.status === 'Sucesso') totais.sucesso = c.total;
      if (c.status === 'Erro') totais.erro = c.total;
      if (c.status === 'Parcial') totais.parcial = c.total;
    });
    const totalGeral = totais.sucesso + totais.erro + totais.parcial;

    // Cards — contagem absoluta + percentual
    const cards = {
      totalRotinas: totalGeral,
      totalSucesso: totais.sucesso,
      totalErro: totais.erro,
      totalParcial: totais.parcial,
      percentualSucesso: totalGeral ? ((totais.sucesso / totalGeral) * 100).toFixed(1) : 0,
      percentualErro: totalGeral ? ((totais.erro / totalGeral) * 100).toFixed(1) : 0,
      percentualParcial: totalGeral ? ((totais.parcial / totalGeral) * 100).toFixed(1) : 0,
      score: this._calcularScore(totais)
    };

    // Tabela analítica com tendência
    const tabelaAnalitica = performance.map(r => {
      const tendencia = this._calcularTendencia(r.id, temporais);
      const scoreRotina = this._calcularScore({
        sucesso: r.sucesso,
        erro: r.erro,
        parcial: r.parcial
      });
      const ultimaExec = ultimasExecucoes.find(e => e.rotina_id === r.id);

      // Se for GLPI, buscar quantidade de chamados do último dia
      let glpiQuantidade = null;
      if (r.nome.toUpperCase() === 'GLPI' && ultimaExec?.data_execucao) {
        const glpiDia = glpiRepository.buscarPorPeriodo(ultimaExec.data_execucao, ultimaExec.data_execucao);
        if (glpiDia.length > 0) glpiQuantidade = glpiDia[0].quantidade;
      }

      return {
        id: r.id,
        nome: r.nome,
        frequencia: r.frequencia,
        total: r.total,
        sucesso: r.sucesso,
        erro: r.erro,
        parcial: r.parcial,
        score: scoreRotina,
        tendencia,
        statusAtual: ultimaExec?.status || 'Sem dados',
        glpiQuantidade,
        detalhes: ultimaExec?.detalhes || null,
        ultimaExecucao: ultimaExec?.data_execucao || null,
        ultimaAtualizacao: ultimaExec?.data_importacao || ultimaExec?.data_execucao || null,
      };
    });

    // Dados para gráfico de pizza
    const pizza = [
      { nome: 'Sucesso', valor: totais.sucesso, cor: '#22c55e' },
      { nome: 'Erro', valor: totais.erro, cor: '#ef4444' },
      { nome: 'Parcial', valor: totais.parcial, cor: '#eab308' }
    ];

    // Resumo últimos 10 dias (seção da imagem de referência)
    const resumo10dias = this._resumo10Dias();

    // Heatmap 10 dias para exibir inline no dashboard
    const heatmap10 = rotinaRepository.dadosHeatmap(10);

    // GLPI últimos 10 dias
    const glpi10dias = this._glpi10Dias();

    return {
      cards,
      graficoTemporal: temporais,
      graficoPizza: pizza,
      graficoBarras: performance.map(r => ({
        nome: r.nome,
        sucesso: r.sucesso,
        erro: r.erro,
        parcial: r.parcial
      })),
      tabelaAnalitica,
      resumo10dias,
      heatmap10,
      glpi10dias,
      periodo: { dataInicio, dataFim }
    };
  },

  /** Calcula score: Sucesso*1 + Parcial*0.5 - Erro*1 */
  _calcularScore({ sucesso, erro, parcial }) {
    const total = sucesso + erro + parcial;
    if (total === 0) return 0;
    const score = ((sucesso * 1) + (parcial * 0.5) - (erro * 1));
    const maxScore = total;
    return Math.max(0, ((score / maxScore) * 100)).toFixed(1);
  },

  /**
   * Calcula tendência de uma rotina
   * Compara a segunda metade do período com a primeira
   * Retorna: 'melhorando', 'piorando' ou 'estavel'
   */
  _calcularTendencia(rotinaId, dadosTemporais) {
    if (dadosTemporais.length < 4) return 'estavel';

    const metade = Math.floor(dadosTemporais.length / 2);
    const primeira = dadosTemporais.slice(0, metade);
    const segunda = dadosTemporais.slice(metade);

    // Calcula taxa de sucesso em cada metade (considerando todas as rotinas)
    const taxaPrimeira = this._taxaSucesso(primeira);
    const taxaSegunda = this._taxaSucesso(segunda);

    const diferenca = taxaSegunda - taxaPrimeira;
    if (diferenca > 5) return 'melhorando';
    if (diferenca < -5) return 'piorando';
    return 'estavel';
  },

  _taxaSucesso(dados) {
    let totalSucesso = 0;
    let totalGeral = 0;
    dados.forEach(d => {
      totalSucesso += d.sucesso;
      totalGeral += d.sucesso + d.erro + d.parcial;
    });
    return totalGeral ? (totalSucesso / totalGeral) * 100 : 0;
  },

  /** Retorna alertas inteligentes */
  obterAlertas() {
    const alertas = [];

    // Erros consecutivos (2+ dias)
    const errosConsec = rotinaRepository.errosConsecutivos();
    errosConsec.forEach(r => {
      alertas.push({
        tipo: 'critico',
        rotina: r.nome,
        mensagem: `${r.nome} com erro por ${r.dias_consecutivos_erro} dias consecutivos`,
        icone: '🔴'
      });
    });

    // Rotinas sem execução recente
    const semExecucao = rotinaRepository.rotinasSemExecucao(3);
    semExecucao.forEach(r => {
      alertas.push({
        tipo: 'aviso',
        rotina: r.nome,
        mensagem: `${r.nome} sem execução há mais de 3 dias`,
        ultimaExecucao: r.ultima_execucao,
        icone: '🟡'
      });
    });

    return alertas;
  },

  /** Resumo dos últimos 10 dias — contagem absoluta por status */
  _resumo10Dias() {
    const { db } = require('../config/database');
    const rows = db.prepare(`
      SELECT status, COUNT(*) as total
      FROM execucoes
      WHERE data_execucao >= date('now', '-10 days')
      GROUP BY status
    `).all();
    const r = { sucesso: 0, erro: 0, parcial: 0 };
    rows.forEach(row => {
      if (row.status === 'Sucesso') r.sucesso = row.total;
      if (row.status === 'Erro') r.erro = row.total;
      if (row.status === 'Parcial') r.parcial = row.total;
    });
    return r;
  },

  /** GLPI últimos 10 dias — lista de { data, quantidade } */
  _glpi10Dias() {
    return glpiRepository.buscarPorPeriodo(
      new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    );
  },

  /** Dados para heatmap */
  obterHeatmap(dias = 30) {
    return rotinaRepository.dadosHeatmap(dias);
  },

  /** Análise mensal */
  analiseMensal() {
    const { db } = require('../config/database');
    return db.prepare(`
      SELECT
        strftime('%Y-%m', data_execucao) as mes,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Sucesso' THEN 1 ELSE 0 END) as sucesso,
        SUM(CASE WHEN status = 'Erro' THEN 1 ELSE 0 END) as erro,
        SUM(CASE WHEN status = 'Parcial' THEN 1 ELSE 0 END) as parcial
      FROM execucoes
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 12
    `).all();
  },

  /** Dados avançados para novos gráficos */
  obterDadosAvancados({ dias = 30 }) {
    const d = new Date(); d.setDate(d.getDate() - dias);
    const dataInicio = d.toISOString().split('T')[0];
    const dataFim = new Date().toISOString().split('T')[0];

    return {
      streaks: rotinaRepository.diasSemErro(),
      sla: rotinaRepository.slaDisponibilidade(dias),
      taxaSucesso: rotinaRepository.taxaSucessoPorRotina({ dataInicio, dataFim }),
      evolucaoDiaria: rotinaRepository.dadosTemporais(dias),
    };
  },

  obterHistoricoRotina(rotinaId, dias = 90) {
    const rotina = rotinaRepository.buscarPorId(rotinaId);
    if (!rotina) return null;
    const historico = rotinaRepository.historicoRotina(rotinaId, dias);
    return { rotina, historico };
  },

  obterCalendarioHeatmap(mes) {
    return rotinaRepository.dadosCalendarioHeatmap(mes);
  },

  obterGlpiTendencia(dias = 90) {
    return glpiRepository.buscarTendencia(dias);
  },

  obterGlpiEnvelhecimento(dias = 30) {
    return glpiRepository.buscarEnvelhecimento(dias);
  },

  /** Comparação entre período atual e anterior (BI) */
  obterComparacao({ dias = 30 }) {
    const { db } = require('../config/database');
    const hoje = new Date().toISOString().split('T')[0];
    const d1 = new Date(); d1.setDate(d1.getDate() - dias);
    const inicioAtual = d1.toISOString().split('T')[0];
    const d2 = new Date(); d2.setDate(d2.getDate() - dias * 2);
    const inicioAnterior = d2.toISOString().split('T')[0];

    const queryPeriodo = (inicio, fim) => {
      const rows = db.prepare(`
        SELECT status, COUNT(*) as total FROM execucoes
        WHERE data_execucao >= ? AND data_execucao <= ?
        GROUP BY status
      `).all(inicio, fim);
      const r = { sucesso: 0, erro: 0, parcial: 0 };
      rows.forEach(row => {
        if (row.status === 'Sucesso') r.sucesso = row.total;
        if (row.status === 'Erro') r.erro = row.total;
        if (row.status === 'Parcial') r.parcial = row.total;
      });
      r.total = r.sucesso + r.erro + r.parcial;
      r.taxaSucesso = r.total ? ((r.sucesso / r.total) * 100) : 0;
      return r;
    };

    const atual = queryPeriodo(inicioAtual, hoje);
    const anterior = queryPeriodo(inicioAnterior, inicioAtual);

    // Comparação por rotina
    const porRotina = db.prepare(`
      SELECT r.nome,
        SUM(CASE WHEN e.data_execucao >= ? AND e.status = 'Sucesso' THEN 1 ELSE 0 END) as suc_atual,
        SUM(CASE WHEN e.data_execucao >= ? AND e.status = 'Erro' THEN 1 ELSE 0 END) as err_atual,
        SUM(CASE WHEN e.data_execucao < ? AND e.data_execucao >= ? AND e.status = 'Sucesso' THEN 1 ELSE 0 END) as suc_anterior,
        SUM(CASE WHEN e.data_execucao < ? AND e.data_execucao >= ? AND e.status = 'Erro' THEN 1 ELSE 0 END) as err_anterior,
        COUNT(CASE WHEN e.data_execucao >= ? THEN 1 END) as total_atual,
        COUNT(CASE WHEN e.data_execucao < ? AND e.data_execucao >= ? THEN 1 END) as total_anterior
      FROM rotinas r
      LEFT JOIN execucoes e ON e.rotina_id = r.id
      WHERE r.ativa = 1
      GROUP BY r.id
      ORDER BY r.nome
    `).all(inicioAtual, inicioAtual, inicioAtual, inicioAnterior, inicioAtual, inicioAnterior, inicioAtual, inicioAtual, inicioAnterior);

    return {
      atual,
      anterior,
      variacao: {
        sucesso: atual.sucesso - anterior.sucesso,
        erro: atual.erro - anterior.erro,
        taxaSucesso: +(atual.taxaSucesso - anterior.taxaSucesso).toFixed(1),
      },
      porRotina,
      periodo: { inicioAtual, inicioAnterior, fim: hoje, dias },
    };
  },

  /** Resumo multi-período (10d, 30d, 90d, mês atual) — suporta filtro por rotina */
  obterResumoMultiPeriodo({ rotina } = {}) {
    const { db } = require('../config/database');
    const mesAtual = new Date().toISOString().slice(0, 7);

    const queryResumo = (where, params = []) => {
      let joinRotina = '';
      if (rotina && rotina !== 'todas') {
        joinRotina = ' JOIN rotinas r ON r.id = execucoes.rotina_id AND r.nome = ?';
        params = [rotina, ...params];
      }
      const rows = db.prepare(`
        SELECT status, COUNT(*) as total FROM execucoes${joinRotina} WHERE ${where} GROUP BY status
      `).all(...params);
      const r = { sucesso: 0, erro: 0, parcial: 0 };
      rows.forEach(row => { r[row.status.toLowerCase()] = row.total; });
      r.total = r.sucesso + r.erro + r.parcial;
      r.taxa = r.total ? +((r.sucesso / r.total) * 100).toFixed(1) : 0;
      return r;
    };

    return {
      '10d': queryResumo("data_execucao >= date('now', '-10 days')"),
      '30d': queryResumo("data_execucao >= date('now', '-30 days')"),
      '90d': queryResumo("data_execucao >= date('now', '-90 days')"),
      mesAtual: queryResumo("strftime('%Y-%m', data_execucao) = ?", [mesAtual]),
    };
  },
};

module.exports = dashboardService;
