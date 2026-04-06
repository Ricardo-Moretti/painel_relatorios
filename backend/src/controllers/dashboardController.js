/**
 * Controller do Dashboard
 * Endpoints para dados do dashboard, alertas e heatmap
 */
const dashboardService = require('../services/dashboardService');

const dashboardController = {
  /** GET /api/dashboard */
  obterDados(req, res, next) {
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
      const dados = dashboardService.obterDados({
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
  obterAlertas(req, res, next) {
    try {
      const alertas = dashboardService.obterAlertas();
      res.json({ sucesso: true, dados: alertas });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/dashboard/heatmap */
  obterHeatmap(req, res, next) {
    try {
      const dias = Math.min(Math.max(req.query.dias ? parseInt(req.query.dias) || 30 : 30, 1), 365);
      const dados = dashboardService.obterHeatmap(dias);
      res.json({ sucesso: true, dados });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/dashboard/mensal */
  analiseMensal(req, res, next) {
    try {
      const dados = dashboardService.analiseMensal();
      res.json({ sucesso: true, dados });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/dashboard/avancado */
  obterDadosAvancados(req, res, next) {
    try {
      const dias = Math.min(Math.max(req.query.dias ? parseInt(req.query.dias) || 30 : 30, 1), 365);
      const dados = dashboardService.obterDadosAvancados({ dias });
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },

  /** GET /api/dashboard/rotina/:id/historico */
  obterHistoricoRotina(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id < 1) {
        return res.status(400).json({ sucesso: false, mensagem: 'ID invalido' });
      }
      const dias = Math.min(Math.max(req.query.dias ? parseInt(req.query.dias) || 90 : 90, 1), 365);
      const dados = dashboardService.obterHistoricoRotina(id, dias);
      if (!dados) return res.status(404).json({ sucesso: false, mensagem: 'Rotina não encontrada' });
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },

  /** GET /api/dashboard/calendario */
  obterCalendarioHeatmap(req, res, next) {
    try {
      const mes = req.query.mes || new Date().toISOString().slice(0, 7);
      // Validate YYYY-MM format
      if (!/^\d{4}-\d{2}$/.test(mes)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Formato de mes invalido (esperado YYYY-MM)' });
      }
      const dados = dashboardService.obterCalendarioHeatmap(mes);
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },

  /** GET /api/dashboard/glpi-tendencia */
  obterGlpiTendencia(req, res, next) {
    try {
      const dias = Math.min(Math.max(req.query.dias ? parseInt(req.query.dias) || 90 : 90, 1), 365);
      const dados = dashboardService.obterGlpiTendencia(dias);
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },

  /** GET /api/dashboard/glpi-envelhecimento */
  obterGlpiEnvelhecimento(req, res, next) {
    try {
      const dias = Math.min(Math.max(req.query.dias ? parseInt(req.query.dias) || 30 : 30, 1), 365);
      const dados = dashboardService.obterGlpiEnvelhecimento(dias);
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },

  /** GET /api/dashboard/comparacao */
  obterComparacao(req, res, next) {
    try {
      const dias = Math.min(Math.max(req.query.dias ? parseInt(req.query.dias) || 30 : 30, 1), 365);
      const dados = dashboardService.obterComparacao({ dias });
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },

  /** GET /api/dashboard/resumo-multi */
  obterResumoMultiPeriodo(req, res, next) {
    try {
      const { rotina } = req.query;
      // Validate rotina filter — must be a short alphanumeric string if provided
      if (rotina && (typeof rotina !== 'string' || rotina.length > 100)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Filtro de rotina invalido' });
      }
      const dados = dashboardService.obterResumoMultiPeriodo({ rotina });
      res.json({ sucesso: true, dados });
    } catch (error) { next(error); }
  },
};

module.exports = dashboardController;
