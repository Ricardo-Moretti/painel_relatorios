/**
 * Service de Autenticacao
 * Regras de negocio para login, registro e validacao
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioRepository = require('../repositories/usuarioRepository');
const { pool } = require('../config/database');
const { getSecureEnv } = require('../config/crypto');
require('dotenv').config();

const SECRET = getSecureEnv('JWT_SECRET');
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const authService = {
  /** Realiza login e retorna token JWT */
  async login(email, senha) {
    const usuario = await usuarioRepository.buscarPorEmail(email);
    if (!usuario) {
      throw Object.assign(new Error('Email ou senha invalidos'), { statusCode: 401 });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      throw Object.assign(new Error('Email ou senha invalidos'), { statusCode: 401 });
    }

    if (!usuario.ativo) {
      throw Object.assign(new Error('Conta desativada'), { statusCode: 403 });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nome: usuario.nome, role: usuario.role },
      SECRET,
      { expiresIn: EXPIRES_IN }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      }
    };
  },

  /** Registra novo usuario */
  async registrar({ nome, email, senha }) {
    const existente = await usuarioRepository.buscarPorEmail(email);
    if (existente) {
      throw Object.assign(new Error('Email ja cadastrado'), { statusCode: 409 });
    }

    const senha_hash = await bcrypt.hash(senha, 12);
    return usuarioRepository.criar({ nome, email, senha_hash });
  },

  /** Retorna dados do usuario autenticado (nunca retorna senha_hash) */
  async perfil(id) {
    const usuario = await usuarioRepository.buscarPorIdSeguro(id);
    if (!usuario) {
      throw Object.assign(new Error('Usuario nao encontrado'), { statusCode: 404 });
    }
    return usuario;
  },

  /**
   * Invalida todos os tokens existentes de um usuario
   * Deve ser chamado ao trocar senha, desativar conta, etc
   * @param {number} userId - ID do usuario
   */
  async invalidarTokens(userId) {
    await pool.execute(
      'UPDATE usuarios SET token_invalidated_at = NOW() WHERE id = ?',
      [userId]
    );
    console.log(`[Auth] Tokens invalidados para usuario ${userId}`);
  },

  /**
   * Altera a senha de um usuario e invalida todos os tokens existentes
   * @param {number} userId - ID do usuario
   * @param {string} senhaAtual - senha atual para verificacao
   * @param {string} novaSenha - nova senha
   */
  async alterarSenha(userId, senhaAtual, novaSenha) {
    const usuarioBase = await usuarioRepository.buscarPorId(userId);
    const usuario = usuarioBase ? await usuarioRepository.buscarPorEmail(usuarioBase.email) : null;
    if (!usuario) {
      throw Object.assign(new Error('Usuario nao encontrado'), { statusCode: 404 });
    }

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha_hash);
    if (!senhaValida) {
      throw Object.assign(new Error('Senha atual incorreta'), { statusCode: 401 });
    }

    // Validate new password strength
    if (!novaSenha || novaSenha.length < 8) {
      throw Object.assign(new Error('Nova senha deve ter no minimo 8 caracteres'), { statusCode: 400 });
    }
    if (novaSenha.length > 128) {
      throw Object.assign(new Error('Senha muito longa'), { statusCode: 400 });
    }
    const novaSenhaHash = await bcrypt.hash(novaSenha, 12);
    await pool.execute(
      'UPDATE usuarios SET senha_hash = ?, atualizado_em = NOW() WHERE id = ?',
      [novaSenhaHash, userId]
    );

    // Invalidate all existing tokens so user must re-login
    await this.invalidarTokens(userId);

    return { sucesso: true, mensagem: 'Senha alterada com sucesso' };
  },
};

module.exports = authService;
