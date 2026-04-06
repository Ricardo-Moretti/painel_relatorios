/**
 * Utilitario de criptografia para proteger credenciais sensíveis
 * Usa AES-256-GCM com chave derivada da maquina (nunca armazenada)
 */
const crypto = require('crypto');
const os = require('os');

// Machine-specific key derived from hostname + OS info (not stored anywhere)
const MACHINE_KEY = crypto.createHash('sha256')
  .update(`${os.hostname()}-${os.userInfo().username}-painel-rotinas-v1`)
  .digest();

/**
 * Encrypts a plaintext string using AES-256-GCM
 * @param {string} text - plaintext to encrypt
 * @returns {string} encrypted string in format ENC:iv:tag:ciphertext
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', MACHINE_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `ENC:${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypts an encrypted string (or returns as-is if not encrypted)
 * @param {string} text - encrypted string or plaintext
 * @returns {string} decrypted plaintext
 */
function decrypt(text) {
  if (!text || !text.startsWith('ENC:')) return text; // not encrypted, return as-is
  const parts = text.split(':');
  if (parts.length < 4) return text; // malformed, return as-is
  const iv = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const encrypted = parts[3];
  const decipher = crypto.createDecipheriv('aes-256-gcm', MACHINE_KEY, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Helper to get env var, auto-decrypting if encrypted
 * @param {string} key - environment variable name
 * @returns {string|null} decrypted value or null
 */
function getSecureEnv(key) {
  const val = process.env[key];
  if (!val) return null;
  try {
    return decrypt(val);
  } catch (e) {
    // If decryption fails, return raw value (backwards compatible)
    return val;
  }
}

module.exports = { encrypt, decrypt, getSecureEnv };
