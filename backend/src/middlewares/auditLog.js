/**
 * Middleware de auditoria de requisicoes
 * Registra todas as requisicoes em arquivo de log para analise de seguranca
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../data');
const LOG_PATH = path.join(LOG_DIR, 'audit.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Max log size: 50MB — rotate when exceeded
const MAX_LOG_SIZE = 50 * 1024 * 1024;

/**
 * Rotaciona o arquivo de log quando excede o tamanho maximo
 */
function rotateLogIfNeeded() {
  try {
    if (fs.existsSync(LOG_PATH)) {
      const stats = fs.statSync(LOG_PATH);
      if (stats.size > MAX_LOG_SIZE) {
        const rotatedPath = LOG_PATH + '.' + new Date().toISOString().replace(/[:.]/g, '-');
        fs.renameSync(LOG_PATH, rotatedPath);
      }
    }
  } catch (e) {
    // Silencioso — nao pode falhar o request por causa de log
  }
}

// Check rotation every 1000 requests
let requestCount = 0;

/**
 * Express middleware que loga todas as requisicoes
 */
function auditLog(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `${new Date().toISOString()} | ${req.ip} | ${req.method} ${req.path} | ${res.statusCode} | ${duration}ms | ${req.usuario?.email || 'anon'}\n`;
    fs.appendFile(LOG_PATH, log, () => {});

    requestCount++;
    if (requestCount % 1000 === 0) {
      rotateLogIfNeeded();
    }
  });

  next();
}

module.exports = { auditLog };
