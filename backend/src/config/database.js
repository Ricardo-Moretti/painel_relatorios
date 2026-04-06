/**
 * Configuracao do banco de dados SQLite
 * Utiliza better-sqlite3 para performance sincrona superior
 * Preparado para futura migracao para PostgreSQL
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Garante que o diretorio de dados existe
const dbPath = process.env.DB_PATH || './data/database.sqlite';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Security: restrict database file permissions (owner read/write only)
try {
  if (fs.existsSync(dbPath)) {
    fs.chmodSync(dbPath, 0o600);
  }
} catch (e) {
  // On Windows, chmod may not work — log warning but don't fail
  console.warn('[Security] Nao foi possivel restringir permissoes do banco:', e.message);
}

const db = new Database(dbPath);

// Configuracoes de performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// Security pragmas
db.pragma('secure_delete = ON');

/**
 * Inicializa as tabelas do banco de dados
 * Cria todas as tabelas necessarias se nao existirem
 */
function inicializarBanco() {
  db.exec(`
    -- Tabela de usuarios para autenticacao
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      ativo INTEGER DEFAULT 1,
      token_invalidated_at TEXT DEFAULT NULL,
      criado_em TEXT DEFAULT (datetime('now')),
      atualizado_em TEXT DEFAULT (datetime('now'))
    );

    -- Tabela de rotinas cadastradas
    CREATE TABLE IF NOT EXISTS rotinas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      frequencia TEXT DEFAULT 'Diaria',
      ativa INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now'))
    );

    -- Tabela de execucoes das rotinas (dados importados)
    CREATE TABLE IF NOT EXISTS execucoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rotina_id INTEGER NOT NULL,
      data_execucao TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Sucesso', 'Erro', 'Parcial')),
      detalhes TEXT,
      origem_arquivo TEXT,
      data_importacao TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (rotina_id) REFERENCES rotinas(id),
      UNIQUE(rotina_id, data_execucao)
    );

    -- Tabela de auditoria de importacoes
    CREATE TABLE IF NOT EXISTS importacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_arquivo TEXT NOT NULL,
      data_importacao TEXT DEFAULT (datetime('now')),
      registros_inseridos INTEGER DEFAULT 0,
      registros_ignorados INTEGER DEFAULT 0,
      usuario_id INTEGER,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    -- Tabela de indicadores GLPI
    CREATE TABLE IF NOT EXISTS indicadores_glpi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL UNIQUE,
      quantidade INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT DEFAULT (datetime('now'))
    );

    -- Cache de dados externos (GLPI, etc) para funcionar offline
    CREATE TABLE IF NOT EXISTS cache_dados (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      atualizado_em TEXT DEFAULT (datetime('now'))
    );

    -- Indices para performance
    CREATE INDEX IF NOT EXISTS idx_execucoes_data ON execucoes(data_execucao);
    CREATE INDEX IF NOT EXISTS idx_execucoes_rotina ON execucoes(rotina_id);
    CREATE INDEX IF NOT EXISTS idx_execucoes_status ON execucoes(status);
    CREATE INDEX IF NOT EXISTS idx_glpi_data ON indicadores_glpi(data);
  `);

  // Migration: add token_invalidated_at column if it doesn't exist
  try {
    const columns = db.prepare("PRAGMA table_info(usuarios)").all();
    const hasColumn = columns.some(c => c.name === 'token_invalidated_at');
    if (!hasColumn) {
      db.exec('ALTER TABLE usuarios ADD COLUMN token_invalidated_at TEXT DEFAULT NULL');
      console.log('[DB] Coluna token_invalidated_at adicionada a tabela usuarios');
    }
  } catch (e) {
    // Column may already exist, ignore
  }

  // Security: restrict file permissions after creation
  try {
    fs.chmodSync(dbPath, 0o600);
  } catch (e) {
    // Windows may not support chmod
  }

  console.log('Banco de dados inicializado com sucesso');
}

module.exports = { db, inicializarBanco };
