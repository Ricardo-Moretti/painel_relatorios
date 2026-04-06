/**
 * Middleware de autenticacao JWT
 * Protege rotas privadas verificando o token Bearer
 * Inclui verificacao de invalidacao de token (por troca de senha etc)
 */
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { getSecureEnv } = require('../config/crypto');
require('dotenv').config();

const SECRET = getSecureEnv('JWT_SECRET');
if (!SECRET || SECRET.length < 32) {
  throw new Error('FATAL: JWT_SECRET nao configurado ou muito curto (minimo 32 caracteres). Verifique o .env');
}

/**
 * Verifica se o token JWT e valido
 * Extrai dados do usuario e anexa ao request
 * Tambem verifica se o token foi invalidado (ex: troca de senha)
 */
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token de autenticacao nao fornecido'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    // Check if token was invalidated (e.g., password change)
    try {
      const usuario = db.prepare(
        'SELECT token_invalidated_at FROM usuarios WHERE id = ?'
      ).get(decoded.id);

      if (usuario && usuario.token_invalidated_at) {
        const invalidatedAt = new Date(usuario.token_invalidated_at).getTime() / 1000;
        // JWT iat is in seconds since epoch
        if (decoded.iat && decoded.iat < invalidatedAt) {
          return res.status(401).json({
            sucesso: false,
            mensagem: 'Token invalidado. Faca login novamente.'
          });
        }
      }
    } catch (dbError) {
      // If DB check fails, still allow the request (backwards compatible)
      console.warn('[Auth] Erro ao verificar invalidacao de token:', dbError.message);
    }

    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token invalido ou expirado'
    });
  }
}

/**
 * Verifica se o usuario tem role de admin
 */
function apenasAdmin(req, res, next) {
  if (req.usuario?.role !== 'admin') {
    return res.status(403).json({
      sucesso: false,
      mensagem: 'Acesso restrito a administradores'
    });
  }
  next();
}

module.exports = { autenticar, apenasAdmin };
