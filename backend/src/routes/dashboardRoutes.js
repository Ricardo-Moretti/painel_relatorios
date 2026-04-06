/**
 * Rotas do Dashboard
 * Dados básicos: todos os usuários autenticados
 * Dados avançados: apenas admin
 */
const { Router } = require('express');
const dashboardController = require('../controllers/dashboardController');
const { autenticar, apenasAdmin } = require('../middlewares/auth');

const router = Router();

// Acesso para todos os usuários autenticados (Dashboard básico)
router.get('/', autenticar, dashboardController.obterDados);
router.get('/alertas', autenticar, dashboardController.obterAlertas);

// Admin only — dados avançados
router.get('/heatmap', autenticar, apenasAdmin, dashboardController.obterHeatmap);
router.get('/mensal', autenticar, apenasAdmin, dashboardController.analiseMensal);
router.get('/avancado', autenticar, apenasAdmin, dashboardController.obterDadosAvancados);
router.get('/rotina/:id/historico', autenticar, apenasAdmin, dashboardController.obterHistoricoRotina);
router.get('/calendario', autenticar, apenasAdmin, dashboardController.obterCalendarioHeatmap);
router.get('/glpi-tendencia', autenticar, apenasAdmin, dashboardController.obterGlpiTendencia);
router.get('/glpi-envelhecimento', autenticar, apenasAdmin, dashboardController.obterGlpiEnvelhecimento);
router.get('/comparacao', autenticar, apenasAdmin, dashboardController.obterComparacao);
router.get('/resumo-multi', autenticar, apenasAdmin, dashboardController.obterResumoMultiPeriodo);

module.exports = router;
