/**
 * Rotas de Autenticacao
 */
const { Router } = require('express');
const authController = require('../controllers/authController');
const { autenticar, apenasAdmin } = require('../middlewares/auth');

const router = Router();

// Rate limiter em memoria para auth endpoints (5 tentativas por minuto por IP)
const authAttempts = new Map();

// Periodic cleanup every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of authAttempts) {
    if (val.every(t => now - t > 120000)) authAttempts.delete(key);
  }
}, 300000);

function authRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const attempts = authAttempts.get(ip) || [];
  const recent = attempts.filter(t => now - t < 60000); // last 60 seconds
  if (recent.length >= 5) {
    console.warn(`[SECURITY] Rate limit exceeded for IP: ${ip} on ${req.method} ${req.path}`);
    return res.status(429).json({ sucesso: false, mensagem: 'Muitas tentativas. Aguarde 1 minuto.' });
  }
  recent.push(now);
  authAttempts.set(ip, recent);
  next();
}

// Rate limiting applied to ALL auth routes
router.post('/login', authRateLimit, authController.login);
router.post('/registrar', authRateLimit, autenticar, apenasAdmin, authController.registrar);
router.get('/perfil', authRateLimit, autenticar, authController.perfil);

module.exports = router;
