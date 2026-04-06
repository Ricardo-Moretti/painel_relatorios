/**
 * Servidor principal do Painel de Rotinas
 * Configura Express com middlewares, rotas e inicia o servidor
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

// Previne crash do processo por erros não tratados
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('[FATAL] Unhandled Rejection:', err.message || err);
});

const { inicializarBanco } = require('./config/database');
const { errorHandler } = require('./middlewares/errorHandler');
const { ipWhitelist } = require('./middlewares/ipWhitelist');
const { auditLog } = require('./middlewares/auditLog');

// Rotas
const authRoutes = require('./routes/authRoutes');
const importacaoRoutes = require('./routes/importacaoRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const rotinaRoutes = require('./routes/rotinaRoutes');
const glpiRoutes = require('./routes/glpiRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// SECURITY: IP Whitelist — FIRST middleware (before everything)
// ============================================================
app.use(ipWhitelist);

// ============================================================
// SECURITY: Audit log — log ALL requests
// ============================================================
app.use(auditLog);

// Middlewares globais
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], fontSrc: ["'self'", "https://fonts.gstatic.com"] }},
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
// SECURITY: CORS whitelist — restrictive, env-configurable
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl)
    if (!origin || CORS_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 600, // 10 minutes preflight cache
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================
// SECURITY: CSRF protection for mutation requests
// All POST/PUT/DELETE/PATCH to /api/ must include X-Requested-With header
// This prevents simple form-based CSRF attacks
// ============================================================
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    if (req.path.startsWith('/api/') && !req.headers['x-requested-with']) {
      return res.status(403).json({ sucesso: false, mensagem: 'Requisicao invalida' });
    }
  }
  next();
});

// SECURITY: Block path traversal attempts
app.use((req, res, next) => {
  if (req.path.includes('..') || req.path.includes('%2e%2e') || req.path.includes('%252e')) {
    return res.status(400).json({ sucesso: false, mensagem: 'Requisicao invalida' });
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/importacao', importacaoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/rotinas', rotinaRoutes);
app.use('/api/glpi', glpiRoutes);

// Servir frontend em producao
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// Error handler global
app.use(errorHandler);

// Agendamento automatico — coleta GLPI a cada hora
const glpiIntegracaoService = require('./services/glpiIntegracaoService');

function agendarColetaGlpi() {
  if (!glpiIntegracaoService.estaConfigurado()) {
    console.log('GLPI nao configurado — coleta automatica desativada');
    return;
  }

  console.log('Coleta automatica GLPI ativada (a cada 1 hora)');

  // Coletar imediatamente ao iniciar
  glpiIntegracaoService.coletarDiario()
    .then(r => console.log(`Coleta GLPI inicial: ${r.totalAbertos} chamados`))
    .catch(e => console.log(`Coleta GLPI inicial falhou: ${e.message}`));

  // Agendar a cada 1 hora (3600000 ms)
  setInterval(() => {
    glpiIntegracaoService.coletarDiario()
      .then(r => console.log(`Coleta GLPI: ${r.totalAbertos} chamados, ${r.envelhecidos} envelhecidos`))
      .catch(e => console.log(`Coleta GLPI falhou: ${e.message}`));
  }, 3600000);
}

// Agendamento de relatório diário às 18h via n8n webhook
const emailService = require('./services/emailService');

function agendarRelatorioDiario() {
  function verificarHorario() {
    const agora = new Date();
    const hora = agora.getHours();
    const minuto = agora.getMinutes();
    const diaSemana = agora.getDay(); // 0=dom, 6=sab

    // 18:00 seg-sex
    if (hora === 17 && minuto === 40 && diaSemana >= 1 && diaSemana <= 5) {
      console.log('[Relatorio] Disparando relatório diário...');
      glpiIntegracaoService.relatorioDiario()
        .then(dados => emailService.enviarRelatorioDiario(dados))
        .then(() => console.log('[Relatorio] Enviado para n8n com sucesso'))
        .catch(e => console.log(`[Relatorio] Falhou: ${e.message}`));
    }
  }

  // Verificar a cada minuto
  setInterval(verificarHorario, 60000);
  console.log('Relatorio diario agendado (18h seg-sex via n8n)');
}

// Inicializar banco e servidor
inicializarBanco().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`API disponivel em http://localhost:${PORT}/api`);
    agendarColetaGlpi();
    agendarRelatorioDiario();
  });
}).catch(err => {
  console.error('[FATAL] Falha ao inicializar banco:', err.message);
  process.exit(1);
});

module.exports = app;
