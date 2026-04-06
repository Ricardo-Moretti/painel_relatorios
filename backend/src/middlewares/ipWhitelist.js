/**
 * Middleware de whitelist de IP
 * Restringe acesso apenas a IPs da rede interna
 * Assume que o atacante pode estar DENTRO da rede corporativa,
 * mas bloqueia qualquer acesso externo.
 */

const ALLOWED_IPS = [
  '127.0.0.1',
  '::1',
  'localhost',
  '172.16.17.138',  // Ricardo's machine
];

/**
 * Verifica se o IP esta na lista de permitidos ou em ranges internos
 * @param {string} ip - endereco IP do request
 * @returns {boolean}
 */
function isAllowed(ip) {
  if (!ip) return false;
  const clean = ip.replace('::ffff:', '');
  if (ALLOWED_IPS.includes(clean)) return true;
  // Allow internal network ranges
  if (clean.startsWith('172.16.') || clean.startsWith('172.17.')) return true;
  if (clean.startsWith('10.')) return true;
  if (clean.startsWith('192.168.')) return true;
  return false;
}

/**
 * Express middleware que bloqueia IPs nao autorizados
 */
function ipWhitelist(req, res, next) {
  const clientIp = req.ip || req.connection.remoteAddress || '';
  if (isAllowed(clientIp)) {
    return next();
  }
  console.warn(`[SECURITY] Blocked request from IP: ${clientIp} - ${req.method} ${req.path}`);
  return res.status(403).json({
    sucesso: false,
    mensagem: 'Acesso negado',
  });
}

module.exports = { ipWhitelist, isAllowed };
