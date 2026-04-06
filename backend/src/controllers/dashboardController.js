/**
 * Controller do Dashboard
 * Endpoints para dados do dashboard, alertas e heatmap
 */
const dashboardService = require('../services/dashboardService');

const dashboardController = {
  /** GET /api/dashboard */
  async obterDados(req, res, next) {
    try {
      const { dataInicio, dataFim, dias } = req.query;
      // Validate date formats if provided
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dataInicio && !dateRegex.test(dataInicio)) {
        return res.status(400).json({ sucesso: false, mensagem: 'dataInicio deve estar no formato YYYY-MM-DD' });
      }
      if (dataFim && !dateRegex.test(dataFim)) {
        return res.status(400).json({ sucesso: false, mensagem: 'dataFim deve estar no formato YYYY-MM-DD' });
      }
      const diasNum = dias ? Math.min(Math.max(parseInt(dias) || 30, 1), 365) : 30;
      const dados = await dashboardService.obterDados({
        dataInicio,
        dataFim,
        dias: diasNum
      });
      res.json({ sucesso: true, dados });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/dashboard/alertas */
  async obterAlertas(req, res, next) {
    try {
      const alertas = await dashboardService.obterAlertas();
      res.json({ sucesso: true, dados: alertas });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/dashboard/heatmap */
  async obterHeatmap(req, res, next) {
    try {
      const dias = Math.min(Math.max(req.query.dias ? parseInt(req.query.dias) || 30 : 30, 1), 365);
      const dados = await dashboardService.obterHeatmap(dias);
      res.json({ sucesso: true, dados });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/dashboard/mensal */
  async analiseMensal(req, res, next) {
    try {
      const dados = await dashboardService.analiseMensal();
      res.json({ sucesso: true, dados });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/dashboard/avancado */
  async obterDadosAvancados(req, res, next) {
    try {
      const dias = Math.min(Math.max(req.query.dias ? parseInt(req.query.dias) || 30 : 30, 1), 365);
      const dados = await dashboardService.obterDadosAvancados({ dias });
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },

  /** GET /api/dashboard/rotina/:id/historico */
  async obterHistoricoRotina(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id < 1) {
        return res.status(400).json({ sucesso: false, mensagem: 'ID invalido' });
      }
      const dias = Math.min(Math.max(req.query.dias ? parseInt(req.query.dias) || 90 : 90, 1), 365);
      const dados = await dashboardService.obterHistoricoRotina(id, dias);
      if (!dados) return res.status(404).json({ sucesso: false, mensagem: 'Rotina não encontrada' });
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },

  /** GET /api/dashboard/calendario */
  async obterCalendarioHeatmap(req, res, next) {
    try {
      const mes = req.query.mes || new Date().toISOString().slice(0, 7);
      // Validate YYYY-MM format
      if (!/^\d{4}-\d{2}$/.test(mes)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Formato de mes invalido (esperado YYYY-MM)' });
      }
      const dados = await dashboardService.obterCalendarioHeatmap(mes);
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },

  /** GET /api/dashboard/glpi-tendencia */
  async obterGlpiTendencia(req, res, next) {
    try {
      const dias = Math.min(Math.max(req.query.dias ? parseInt(req.query.dias) || 90 : 90, 1), 365);
      const dados = await dashboardService.obterGlpiTendencia(dias);
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },

  /** GET /api/dashboard/glpi-envelhecimento */
  async obterGlpiEnvelhecimento(req, res, next) {
    try {
      const dias = Math.min(Math.max(req.query.dias ? parseInt(req.query.dias) || 30 : 30, 1), 365);
      const dados = await dashboardService.obterGlpiEnvelhecimento(dias);
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },

  /** GET /api/dashboard/comparacao */
  async obterComparacao(req, res, next) {
    try {
      const dias = Math.min(Math.max(req.query.dias ? parseInt(req.query.dias) || 30 : 30, 1), 365);
      const dados = await dashboardService.obterComparacao({ dias });
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },

  /** GET /api/dashboard/resumo-multi */
  async obterResumoMultiPeriodo(req, res, next) {
    try {
      const { rotina } = req.query;
      // Validate rotina filter — must be a short alphanumeric string if provided
      if (rotina && (typeof rotina !== 'string' || rotina.length > 100)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Filtro de rotina invalido' });
      }
      const dados = await dashboardService.obterResumoMultiPeriodo({ rotina });
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },
};

module.exports = dashboardController;
