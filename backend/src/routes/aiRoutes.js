/**
 * Rotas de IA — 5 features integradas com OpenAI
 */
const { Router } = require('express');
const { autenticar, apenasAdmin } = require('../middlewares/auth');
const aiService = require('../services/aiService');
const glpiIntegracaoService = require('../services/glpiIntegracaoService');
const rotinaRepository = require('../repositories/rotinaRepository');
const glpiRepository = require('../repositories/glpiRepository');

const router = Router();

// Rate limit simples em memória para o chat
const chatRateLimit = new Map();
function checkChatRate(userId) {
  const agora = Date.now();
  const janela = 60 * 60 * 1000; // 1 hora
  const limite = 20;
  const registros = (chatRateLimit.get(userId) || []).filter(t => agora - t < janela);
  if (registros.length >= limite) return false;
  registros.push(agora);
  chatRateLimit.set(userId, registros);
  return true;
}

// ─── Feature 1: Narrativa diária ─────────────────────────────────────────────
// Sem JWT — protegido por X-AI-Secret (chamado pelo n8n server-to-server)
router.get('/narrativa', async (req, res, next) => {
  try {
    const secret = req.headers['x-ai-secret'];
    if (!process.env.AI_WEBHOOK_SECRET || secret !== process.env.AI_WEBHOOK_SECRET) {
      return res.status(401).json({ sucesso: false, mensagem: 'Nao autorizado' });
    }
    const dados = await glpiIntegracaoService.relatorioDiario();
    const narrativa = await aiService.gerarNarrativa(dados.resumo);
    res.json({ sucesso: true, narrativa });
  } catch (e) { next(e); }
});

// ─── Feature 2: Detecção de anomalias ────────────────────────────────────────
router.get('/anomalias', autenticar, async (req, res, next) => {
  try {
    const [historico, erros, semExec] = await Promise.all([
      rotinaRepository.dadosTemporais(30),
      rotinaRepository.errosConsecutivos(),
      rotinaRepository.rotinasSemExecucao(3),
    ]);
    const glpiHist = await glpiRepository.buscarPorPeriodo(
      new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    ).catch(() => []);

    const anomalias = await aiService.detectarAnomalias({ historico, erros, semExec, glpiHist });
    res.json({ sucesso: true, anomalias });
  } catch (e) { next(e); }
});

// ─── Feature 3: Chat com os dados ────────────────────────────────────────────
router.post('/chat', autenticar, async (req, res, next) => {
  try {
    const { pergunta } = req.body;
    if (!pergunta || typeof pergunta !== 'string' || pergunta.trim().length === 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Pergunta invalida' });
    }
    if (pergunta.length > 500) {
      return res.status(400).json({ sucesso: false, mensagem: 'Pergunta muito longa (max 500 caracteres)' });
    }
    if (!checkChatRate(req.usuario.id)) {
      return res.status(429).json({ sucesso: false, mensagem: 'Limite de 20 perguntas por hora atingido' });
    }

    const glpiConfigurado = glpiIntegracaoService.estaConfigurado();
    const d7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const hoje = new Date().toISOString().split('T')[0];
    const timeout = (ms) => new Promise(r => setTimeout(() => r(null), ms));

    // Tudo em paralelo — local (rápido) + GLPI (timeout 10s máximo)
    const [
      ultimasExecucoes, historico30d, errosConsecutivos, semExecucao, glpiPeriodo,
      resumoRapido,
    ] = await Promise.all([
      rotinaRepository.buscarUltimasExecucoes().catch(() => []),
      rotinaRepository.dadosTemporais(30).catch(() => []),
      rotinaRepository.errosConsecutivos().catch(() => []),
      rotinaRepository.rotinasSemExecucao(3).catch(() => []),
      glpiRepository.buscarPorPeriodo(d7, hoje).catch(() => []),
      glpiConfigurado
        ? Promise.race([glpiIntegracaoService.resumoRapidoParaChat(), timeout(10000)]).catch(() => null)
        : null,
    ]);

    const snapshot = {
      produto: 'Painel de Rotinas TI — John Deere Tracbel',
      dataHoje: hoje,
      glpiHoje: resumoRapido || null,
      rotinas: {
        ultimaExecucaoCadaRotina: ultimasExecucoes,
        historico30dias: historico30d,
        alertas: { errosConsecutivos, rotinasSemExecucao: semExecucao },
      },
      glpiUltimos7Dias: glpiPeriodo,
    };
    const resposta = await aiService.responderChat(pergunta.trim(), snapshot);
    res.json({ sucesso: true, resposta });
  } catch (e) { next(e); }
});

// ─── Feature 4: Resumo inteligente de chamados ───────────────────────────────
router.get('/resumo-chamados', autenticar, async (req, res, next) => {
  try {
    if (!glpiIntegracaoService.estaConfigurado()) {
      return res.json({ sucesso: true, grupos: [], aviso: 'GLPI nao configurado' });
    }
    const titulos = await glpiIntegracaoService.buscarTitulosChamadosAbertos();
    if (!titulos.length) {
      return res.json({ sucesso: true, grupos: [] });
    }
    const grupos = await aiService.resumirChamados(titulos);
    res.json({ sucesso: true, grupos });
  } catch (e) { next(e); }
});

// ─── Feature 5: Previsão de volume ───────────────────────────────────────────
router.get('/previsao', autenticar, async (req, res, next) => {
  try {
    const historico = await glpiRepository.buscarPorPeriodo(
      new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    ).catch(() => []);

    if (historico.length < 7) {
      return res.json({ sucesso: true, previsao: [], aviso: 'Dados insuficientes para previsao (minimo 7 dias)' });
    }
    const previsao = await aiService.preverVolume(historico);
    res.json({ sucesso: true, previsao });
  } catch (e) { next(e); }
});

module.exports = router;
