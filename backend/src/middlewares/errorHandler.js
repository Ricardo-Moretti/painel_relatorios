/**
 * Middleware global de tratamento de erros
 * Centraliza o tratamento de exceções da API
 * NUNCA expõe stack traces ao cliente, independente do ambiente
 */
function errorHandler(err, req, res, _next) {
  console.error(`[ERRO] ${req.method} ${req.path}:`, err.message);

  const statusCode = err.statusCode || 500;
  const mensagem = statusCode === 500
    ? 'Erro interno do servidor'
    : err.message;

  res.status(statusCode).json({
    sucesso: false,
    mensagem,
  });
}

module.exports = { errorHandler };
