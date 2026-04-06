/**
 * Rotas de GLPI — admin only (exceto status-integracao)
 */
const { Router } = require('express');
const glpiController = require('../controllers/glpiController');
const { autenticar, apenasAdmin } = require('../middlewares/auth');

const router = Router();

// Todas as rotas GLPI são admin only
router.get('/', autenticar, apenasAdmin, glpiController.listar);
router.get('/estatisticas', autenticar, apenasAdmin, glpiController.estatisticas);
router.post('/', autenticar, apenasAdmin, glpiController.inserir);
router.post('/coletar', autenticar, apenasAdmin, glpiController.coletar);
router.get('/testar', autenticar, apenasAdmin, glpiController.testarConexao);
router.get('/bi', autenticar, apenasAdmin, glpiController.obterBI);
router.get('/sla-detalhado', autenticar, apenasAdmin, glpiController.obterSLADetalhado);
router.get('/relatorio-diario', autenticar, apenasAdmin, glpiController.relatorioDiario);
router.post('/enviar-relatorio', autenticar, apenasAdmin, glpiController.enviarRelatorio);
router.get('/explorar', autenticar, apenasAdmin, glpiController.explorar);
router.get('/metricas-categorias', autenticar, apenasAdmin, glpiController.metricasCategorias);
router.get('/filtros', autenticar, apenasAdmin, glpiController.listarFiltros);
router.get('/comparar-meses', autenticar, apenasAdmin, glpiController.compararMeses);
router.get('/status-integracao', autenticar, glpiController.statusIntegracao);

module.exports = router;
