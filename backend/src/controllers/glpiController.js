/**
 * Controller de GLPI
 * Gerenciamento de indicadores de chamados
 */
const glpiRepository = require('../repositories/glpiRepository');

const glpiIntegracaoService = require('../services/glpiIntegracaoService');

const glpiController = {
  /** POST /api/glpi */
  async inserir(req, res, next) {
    try {
      const { data, quantidade } = req.body;
      if (!data || quantidade === undefined) {
        return res.status(400).json({ sucesso: false, mensagem: 'Data e quantidade sao obrigatorios' });
      }
      // Validate date format
      if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Data deve estar no formato YYYY-MM-DD' });
      }
      // Validate quantidade is a reasonable integer
      const qtd = parseInt(quantidade);
      if (isNaN(qtd) || qtd < 0 || qtd > 100000) {
        return res.status(400).json({ sucesso: false, mensagem: 'Quantidade deve ser um numero entre 0 e 100000' });
      }
      await glpiRepository.upsert({ data, quantidade: qtd });
      res.json({ sucesso: true, mensagem: 'Indicador GLPI salvo com sucesso' });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/glpi */
  async listar(req, res, next) {
    try {
      const { dataInicio, dataFim } = req.query;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dataInicio && !dateRegex.test(dataInicio)) {
        return res.status(400).json({ sucesso: false, mensagem: 'dataInicio deve estar no formato YYYY-MM-DD' });
      }
      if (dataFim && !dateRegex.test(dataFim)) {
        return res.status(400).json({ sucesso: false, mensagem: 'dataFim deve estar no formato YYYY-MM-DD' });
      }
      const inicio = dataInicio || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const fim = dataFim || new Date().toISOString().split('T')[0];
      const dados = await glpiRepository.buscarPorPeriodo(inicio, fim);
      res.json({ sucesso: true, dados });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/glpi/estatisticas */
  async estatisticas(req, res, next) {
    try {
      const dias = Math.min(req.query.dias ? parseInt(req.query.dias) : 30, 365);
      const dados = await glpiRepository.estatisticas(dias);
      res.json({ sucesso: true, dados });
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/glpi/coletar — dispara coleta manual do GLPI */
  async coletar(req, res, next) {
    try {
      const resultado = await glpiIntegracaoService.coletarDiario();
      glpiIntegracaoService._salvarCache('glpi_coleta', resultado);
      res.json({ sucesso: true, dados: resultado, mensagem: 'Coleta GLPI realizada com sucesso' });
    } catch (error) {
      // Se sem conexão, retorna último dado do cache
      const cache = glpiIntegracaoService._lerCache('glpi_coleta');
      if (cache) {
        return res.json({ sucesso: true, dados: { ...cache.dados, online: false, cacheDesde: cache.atualizado_em }, mensagem: 'Dados do cache (sem conexão MySQL)' });
      }
      next(error);
    }
  },

  /** GET /api/glpi/testar — testa conexão com GLPI */
  async testarConexao(req, res, next) {
    try {
      if (!glpiIntegracaoService.estaConfigurado()) {
        return res.json({ sucesso: false, mensagem: 'GLPI não configurado. Defina as variáveis no .env' });
      }
      await glpiIntegracaoService.testarConexao();
      res.json({ sucesso: true, mensagem: 'Conexão com GLPI OK' });
    } catch (error) {
      res.json({ sucesso: false, mensagem: `Falha na conexão: ${error.message}` });
    }
  },

  /** GET /api/glpi/bi — BI completo SLA (com cache offline) */
  async obterBI(req, res, next) {
    const dias = Math.min(req.query.dias ? parseInt(req.query.dias) : 30, 365);
    try {
      const [basico, avancado] = await Promise.all([
        glpiIntegracaoService.obterBI({ dias }),
        glpiIntegracaoService.obterBIAvancado({ dias }),
      ]);
      const resultado = { ...basico, ...avancado, online: true };
      glpiIntegracaoService._salvarCache(`glpi_bi_${dias}`, resultado);
      res.json({ sucesso: true, dados: resultado });
    } catch (error) {
      const cache = glpiIntegracaoService._lerCache(`glpi_bi_${dias}`);
      if (cache) {
        console.log(`[GLPI] Usando cache de ${cache.atualizado_em}`);
        return res.json({ sucesso: true, dados: { ...cache.dados, online: false, cacheDesde: cache.atualizado_em } });
      }
      next(error);
    }
  },

  /** GET /api/glpi/sla-detalhado — SLA detalhado com métricas avançadas */
  async obterSLADetalhado(req, res, next) {
    try {
      const dias = Math.min(req.query.dias ? parseInt(req.query.dias) : 30, 365);
      const resultado = await glpiIntegracaoService.obterSLADetalhado({ dias });
      glpiIntegracaoService._salvarCache(`glpi_sla_detalhado_${dias}`, resultado);
      res.json({ sucesso: true, dados: { ...resultado, online: true } });
    } catch (error) {
      const diasFallback = Math.min(req.query.dias ? parseInt(req.query.dias) : 30, 365);
      const cache = glpiIntegracaoService._lerCache(`glpi_sla_detalhado_${diasFallback}`);
      if (cache) {
        console.log(`[GLPI] SLA Detalhado usando cache de ${cache.atualizado_em}`);
        return res.json({ sucesso: true, dados: { ...cache.dados, online: false, cacheDesde: cache.atualizado_em } });
      }
      next(error);
    }
  },

  /** GET /api/glpi/relatorio-diario — métricas do dia */
  async relatorioDiario(req, res, next) {
    try {
      const dados = await glpiIntegracaoService.relatorioDiario();
      glpiIntegracaoService._salvarCache('glpi_relatorio_diario', dados);
      res.json({ sucesso: true, dados });
    } catch (error) {
      const cache = glpiIntegracaoService._lerCache('glpi_relatorio_diario');
      if (cache) return res.json({ sucesso: true, dados: { ...cache.dados, online: false, cacheDesde: cache.atualizado_em } });
      next(error);
    }
  },

  /** POST /api/glpi/enviar-relatorio — dispara envio manual do relatório para n8n */
  async enviarRelatorio(req, res, next) {
    try {
      const emailService = require('../services/emailService');
      const aiService = require('../services/aiService');
      // Responde imediatamente — coleta + narrativa IA + envio rodam em background
      res.json({ sucesso: true, mensagem: 'Relatório sendo gerado e enviado em background...' });

      glpiIntegracaoService.relatorioDiario()
        .then(async (dados) => {
          // Gera narrativa IA no backend e inclui no payload
          let narrativa = '';
          try {
            narrativa = await aiService.gerarNarrativa(dados.resumo);
          } catch (e) {
            console.warn('[Email] Narrativa IA falhou, enviando sem ela:', e.message);
          }
          return emailService.enviarRelatorioDiario({ ...dados, narrativa });
        })
        .then(() => console.log('[Email] Relatório enviado ao n8n com sucesso'))
        .catch(err => console.error('[Email] Erro ao enviar relatório:', err.message));
    } catch (error) { next(error); }
  },

  /** GET /api/glpi/explorar — pesquisa avançada de chamados */
  async explorar(req, res, next) {
    try {
      const { dias, categoria, atendente, status, urgencia, prioridade, busca, ordenar, limite, pagina } = req.query;
      const dados = await glpiIntegracaoService.explorarChamados({
        dias: Math.min(parseInt(dias) || 90, 365),
        categoria, atendente, status, urgencia, prioridade, busca, ordenar,
        limite: Math.min(parseInt(limite) || 50, 100),
        pagina: parseInt(pagina) || 0,
      });
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },

  /** GET /api/glpi/filtros — lista filtros disponíveis */
  async listarFiltros(req, res, next) {
    try {
      const dados = await glpiIntegracaoService.listarFiltros();
      glpiIntegracaoService._salvarCache('glpi_filtros', dados);
      res.json({ sucesso: true, dados });
    } catch (error) {
      const cache = glpiIntegracaoService._lerCache('glpi_filtros');
      if (cache) return res.json({ sucesso: true, dados: { ...cache.dados, online: false } });
      next(error);
    }
  },

  /** GET /api/glpi/comparar-meses — comparação mês atual vs anterior + previsão */
  async compararMeses(req, res, next) {
    try {
      const resultado = await glpiIntegracaoService.compararMeses();
      glpiIntegracaoService._salvarCache('glpi_comparar_meses', resultado);
      res.json({ sucesso: true, dados: resultado });
    } catch (error) {
      const cache = glpiIntegracaoService._lerCache('glpi_comparar_meses');
      if (cache) return res.json({ sucesso: true, dados: { ...cache.dados, online: false, cacheDesde: cache.atualizado_em } });
      next(error);
    }
  },

  /** GET /api/glpi/metricas-categorias — VPN, Reset senha, etc */
  async metricasCategorias(req, res, next) {
    try {
      const dias = Math.min(parseInt(req.query.dias) || 90, 365);
      const dados = await glpiIntegracaoService.metricasPorCategoria({ dias });
      glpiIntegracaoService._salvarCache('glpi_metricas_cat', dados);
      res.json({ sucesso: true, dados });
    } catch (error) {
      const cache = glpiIntegracaoService._lerCache('glpi_metricas_cat');
      if (cache) return res.json({ sucesso: true, dados: { ...cache.dados, online: false } });
      next(error);
    }
  },

  /** GET /api/glpi/status-integracao — verifica se esta configurado */
  statusIntegracao(req, res) {
    res.json({
      sucesso: true,
      dados: {
        configurado: glpiIntegracaoService.estaConfigurado(),
        // SECURITY: Do not expose internal URLs to the client
      },
    });
  },
};

module.exports = glpiController;
