/**
 * Rotas de Rotinas
 * Listagem: todos autenticados
 * Criação, registro, webhook: admin only
 */
const { Router } = require('express');
const rotinaController = require('../controllers/rotinaController');
const { autenticar, apenasAdmin } = require('../middlewares/auth');

const router = Router();

// Leitura — todos autenticados
router.get('/', autenticar, rotinaController.listar);
router.get('/execucoes', autenticar, rotinaController.execucoes);
router.get('/:id', autenticar, rotinaController.buscar);

// Escrita — admin only
router.post('/', autenticar, apenasAdmin, rotinaController.criar);
router.post('/registro-diario', autenticar, apenasAdmin, rotinaController.registroDiario);
router.post('/webhook', autenticar, apenasAdmin, rotinaController.webhook);

// DPM desativado temporariamente
// router.post('/dpm/verificar', autenticar, apenasAdmin, rotinaController.verificarDPM);
// router.post('/dpm/backfill', autenticar, apenasAdmin, rotinaController.backfillDPM);
// router.get('/dpm/testar', autenticar, apenasAdmin, rotinaController.testarDPM);

module.exports = router;
