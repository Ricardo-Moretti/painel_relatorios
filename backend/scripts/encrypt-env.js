#!/usr/bin/env node
/**
 * CLI Script para criptografar valores sensiveis no .env
 * Uso: node scripts/encrypt-env.js
 *
 * Le o arquivo .env, criptografa campos sensiveis e reescreve o arquivo.
 * Valores ja criptografados (prefixo ENC:) sao ignorados.
 */
const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('../src/config/crypto');

const ENV_PATH = path.join(__dirname, '../.env');

// Chaves que devem ser criptografadas
const SENSITIVE_KEYS = [
  'JWT_SECRET',
  'GLPI_MYSQL_PASSWORD',
  'GLPI_APP_TOKEN',
  'GLPI_USER_TOKEN',
  'GLPI_PASSWORD',
  'DB_PASSWORD',
  'SESSION_SECRET',
  'API_KEY',
  'SECRET_KEY',
];

function main() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error('Arquivo .env nao encontrado em:', ENV_PATH);
    process.exit(1);
  }

  const content = fs.readFileSync(ENV_PATH, 'utf8');
  const lines = content.split('\n');
  let encrypted = 0;
  let skipped = 0;

  const newLines = lines.map(line => {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) return line;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return line;

    const key = line.substring(0, eqIndex).trim();
    const value = line.substring(eqIndex + 1).trim();

    // Check if this key should be encrypted
    if (SENSITIVE_KEYS.some(sk => key.includes(sk))) {
      if (value.startsWith('ENC:')) {
        skipped++;
        console.log(`  [SKIP] ${key} (ja criptografado)`);
        return line;
      }
      if (!value) {
        skipped++;
        console.log(`  [SKIP] ${key} (vazio)`);
        return line;
      }
      const encryptedValue = encrypt(value);
      encrypted++;
      console.log(`  [ENC]  ${key} = ENC:****`);
      return `${key}=${encryptedValue}`;
    }

    return line;
  });

  if (encrypted > 0) {
    // Backup original
    const backupPath = ENV_PATH + '.backup.' + Date.now();
    fs.copyFileSync(ENV_PATH, backupPath);
    console.log(`\nBackup salvo em: ${backupPath}`);

    fs.writeFileSync(ENV_PATH, newLines.join('\n'), 'utf8');
    console.log(`\n${encrypted} valor(es) criptografado(s), ${skipped} ignorado(s).`);
    console.log('Arquivo .env atualizado com sucesso.');
  } else {
    console.log(`\nNenhum valor para criptografar. ${skipped} ja criptografado(s).`);
  }

  // Verify decryption works
  console.log('\nVerificando descriptografia...');
  const verifyContent = fs.readFileSync(ENV_PATH, 'utf8');
  const verifyLines = verifyContent.split('\n');
  let allOk = true;
  for (const vl of verifyLines) {
    const eqIdx = vl.indexOf('=');
    if (eqIdx === -1) continue;
    const key = vl.substring(0, eqIdx).trim();
    const value = vl.substring(eqIdx + 1).trim();
    if (value.startsWith('ENC:')) {
      try {
        decrypt(value);
        console.log(`  [OK] ${key}`);
      } catch (e) {
        console.error(`  [ERRO] ${key}: falha na descriptografia!`);
        allOk = false;
      }
    }
  }
  if (allOk) {
    console.log('\nTodos os valores descriptografam corretamente.');
  } else {
    console.error('\nALERTA: Alguns valores falharam na verificacao!');
    process.exit(1);
  }
}

main();
