/**
 * Controller de Autenticação
 * Endpoints de login, registro e perfil
 */
const authService = require('../services/authService');

const authController = {
  /** POST /api/auth/login */
  async login(req, res, next) {
    try {
      const { email, senha } = req.body;
      if (!email || !senha) {
        return res.status(400).json({ sucesso: false, mensagem: 'Email e senha sao obrigatorios' });
      }
      // Validate types
      if (typeof email !== 'string' || typeof senha !== 'string') {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados invalidos' });
      }
      // Validate email format and length
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Formato de email invalido' });
      }
      // Limit password length to prevent bcrypt DoS (bcrypt truncates at 72 bytes)
      if (senha.length > 128) {
        return res.status(400).json({ sucesso: false, mensagem: 'Senha muito longa' });
      }
      const resultado = await authService.login(email, senha);
      res.json({ sucesso: true, dados: resultado });
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/auth/registrar */
  async registrar(req, res, next) {
    try {
      const { nome, email, senha } = req.body;
      if (!nome || !email || !senha) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome, email e senha sao obrigatorios' });
      }
      // Validate types
      if (typeof nome !== 'string' || typeof email !== 'string' || typeof senha !== 'string') {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados invalidos' });
      }
      // Validate name length
      if (nome.length < 2 || nome.length > 100) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome deve ter entre 2 e 100 caracteres' });
      }
      // Validate email format and length
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Formato de email invalido' });
      }
      // Validate password strength
      if (senha.length < 8) {
        return res.status(400).json({ sucesso: false, mensagem: 'Senha deve ter no minimo 8 caracteres' });
      }
      if (senha.length > 128) {
        return res.status(400).json({ sucesso: false, mensagem: 'Senha muito longa' });
      }
      const usuario = await authService.registrar({ nome, email, senha });
      res.status(201).json({ sucesso: true, dados: usuario });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/auth/perfil */
  perfil(req, res, next) {
    try {
      const usuario = authService.perfil(req.usuario.id);
      res.json({ sucesso: true, dados: usuario });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;
