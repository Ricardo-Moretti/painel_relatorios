-- =============================================
-- PAINEL DE ROTINAS — Setup completo MySQL
-- Execute este arquivo no DBeaver
-- =============================================

CREATE DATABASE IF NOT EXISTS painel_rotinas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE painel_rotinas;

-- =============================================
-- TABELAS
-- =============================================

CREATE TABLE IF NOT EXISTS usuarios (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  nome                 VARCHAR(255) NOT NULL,
  email                VARCHAR(255) NOT NULL UNIQUE,
  senha_hash           TEXT NOT NULL,
  role                 VARCHAR(50) DEFAULT 'user',
  ativo                TINYINT(1) DEFAULT 1,
  token_invalidated_at DATETIME DEFAULT NULL,
  criado_em            DATETIME DEFAULT NOW(),
  atualizado_em        DATETIME DEFAULT NOW() ON UPDATE NOW()
);

CREATE TABLE IF NOT EXISTS rotinas (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(255) NOT NULL UNIQUE,
  frequencia VARCHAR(50) DEFAULT 'Diária',
  ativa      TINYINT(1) DEFAULT 1,
  criado_em  DATETIME DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execucoes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  rotina_id       INT NOT NULL,
  data_execucao   DATE NOT NULL,
  status          ENUM('Sucesso','Erro','Parcial') NOT NULL,
  detalhes        TEXT,
  origem_arquivo  VARCHAR(255),
  data_importacao DATETIME DEFAULT NOW(),
  FOREIGN KEY (rotina_id) REFERENCES rotinas(id),
  UNIQUE KEY uq_rotina_data (rotina_id, data_execucao)
);

CREATE TABLE IF NOT EXISTS importacoes (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  nome_arquivo        VARCHAR(255) NOT NULL,
  data_importacao     DATETIME DEFAULT NOW(),
  registros_inseridos INT DEFAULT 0,
  registros_ignorados INT DEFAULT 0,
  usuario_id          INT,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS indicadores_glpi (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  data       DATE NOT NULL UNIQUE,
  quantidade INT NOT NULL DEFAULT 0,
  criado_em  DATETIME DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cache_dados (
  chave         VARCHAR(255) PRIMARY KEY,
  valor         LONGTEXT NOT NULL,
  atualizado_em DATETIME DEFAULT NOW() ON UPDATE NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_execucoes_data   ON execucoes(data_execucao);
CREATE INDEX IF NOT EXISTS idx_execucoes_rotina ON execucoes(rotina_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_status ON execucoes(status);
CREATE INDEX IF NOT EXISTS idx_glpi_data        ON indicadores_glpi(data);

-- =============================================
-- DADOS EXPORTADOS DO SQLITE
-- =============================================

-- USUARIOS
INSERT IGNORE INTO usuarios (id,nome,email,senha_hash,role,ativo,token_invalidated_at,criado_em,atualizado_em) VALUES (1,'Administrador','admin@painel.com','$2a$10$4TR6L0HvkOLRPhKmCMNcAODgPMWNsUUdC.WrkHT0LXXOWRl96FsqC','admin',1,NULL,'2026-03-29 20:29:38','2026-03-29 20:29:38');

-- ROTINAS
INSERT IGNORE INTO rotinas (id,nome,frequencia,ativa,criado_em) VALUES (1,'DPM','Diária',1,'2026-03-29 20:29:38');
INSERT IGNORE INTO rotinas (id,nome,frequencia,ativa,criado_em) VALUES (2,'Elipse','Diária',1,'2026-03-29 20:29:38');
INSERT IGNORE INTO rotinas (id,nome,frequencia,ativa,criado_em) VALUES (3,'Loja autonoma','Diária',1,'2026-03-29 20:29:38');
INSERT IGNORE INTO rotinas (id,nome,frequencia,ativa,criado_em) VALUES (4,'GLPI','Diária',1,'2026-03-29 20:29:38');
INSERT IGNORE INTO rotinas (id,nome,frequencia,ativa,criado_em) VALUES (5,'PMM','Diária',1,'2026-03-31 14:10:52');
INSERT IGNORE INTO rotinas (id,nome,frequencia,ativa,criado_em) VALUES (6,'Garantia','Diária',1,'2026-03-31 14:10:52');
INSERT IGNORE INTO rotinas (id,nome,frequencia,ativa,criado_em) VALUES (7,'JDPrisma (Transferencia)','Diária',1,'2026-03-31 14:10:52');
INSERT IGNORE INTO rotinas (id,nome,frequencia,ativa,criado_em) VALUES (8,'CGPool','Diária',1,'2026-03-31 14:10:52');
INSERT IGNORE INTO rotinas (id,nome,frequencia,ativa,criado_em) VALUES (9,'ShopDeere (Delta)','Diária',1,'2026-03-31 14:10:52');

-- Ajusta o AUTO_INCREMENT para não conflitar com os IDs inseridos
ALTER TABLE rotinas AUTO_INCREMENT = 10;

-- EXECUCOES
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (1,1,'2026-03-18','Sucesso','Gerou e enviou','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (2,1,'2026-03-19','Sucesso','Gerou e enviou','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (3,1,'2026-03-20','Sucesso','Gerou e enviou','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (4,1,'2026-03-21','Sucesso','Gerou e enviou','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (5,1,'2026-03-22','Sucesso','Gerou e enviou','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (6,1,'2026-03-23','Sucesso','Gerou e enviou','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (7,1,'2026-03-24','Sucesso','Gerou e enviou','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (8,1,'2026-03-25','Sucesso','Gerou e enviou','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (9,1,'2026-03-26','Sucesso','Gerou e enviou','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (10,1,'2026-03-27','Erro','Gerado e enviado manualmente. Reinit atrapalhou a geração','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (11,2,'2026-03-18','Erro',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (12,2,'2026-03-19','Sucesso',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (13,2,'2026-03-20','Erro',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (14,2,'2026-03-21','Sucesso',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (15,2,'2026-03-22','Sucesso',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (16,2,'2026-03-23','Erro',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (17,2,'2026-03-24','Sucesso',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (18,2,'2026-03-25','Sucesso',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (19,2,'2026-03-26','Sucesso',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (20,2,'2026-03-27','Erro',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (21,3,'2026-03-18','Sucesso','Validação ok, imagens pendentes','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (22,3,'2026-03-19','Sucesso',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (23,3,'2026-03-20','Parcial',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (24,3,'2026-03-21','Sucesso',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (25,3,'2026-03-22','Sucesso',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (26,3,'2026-03-23','Sucesso',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (27,3,'2026-03-24','Sucesso',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (28,3,'2026-03-25','Sucesso',NULL,'Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (29,3,'2026-03-26','Erro','Esquecemos de testar','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (30,3,'2026-03-27','Sucesso','OK','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (31,4,'2026-03-18','Erro','22 com mais de 45 dias','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (32,4,'2026-03-19','Erro','20 com mais de 45 dias','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (33,4,'2026-03-20','Erro','19 com mais de 45 dias','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (34,4,'2026-03-21','Erro','19 com mais de 45 dias','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (35,4,'2026-03-22','Erro','19 com mais de 45 dias','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (36,4,'2026-03-23','Erro','19 com mais de 45 dias','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (37,4,'2026-03-24','Erro','18 com mais de 45 dias','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (38,4,'2026-03-25','Erro','17 com mais de 45 dias','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (39,4,'2026-03-26','Erro','17 com mais de 45 dias','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (40,4,'2026-03-27','Parcial','17 com mais de 45 dias','Carga2.xlsx','2026-03-29 20:29:48');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (52,4,'2026-03-30','Erro','21 com mais de 45 dias | Novos: 0, Atrib: 36, Pend: 32',NULL,'2026-03-30 21:32:33');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (58,1,'2026-03-30','Sucesso','Arquivo DPM gerado às 23:37:28 (3 arquivo(s) no dia)',NULL,'2026-03-31 11:17:13');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (143,4,'2026-03-31','Erro','21 com mais de 45 dias | Novos: 0, Atrib: 26, Pend: 33',NULL,'2026-03-31 22:10:27');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (147,1,'2026-04-01','Sucesso','<script>alert("xss")</script>',NULL,'2026-04-01 01:13:44');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (180,1,'2026-03-28','Sucesso','','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (181,1,'2026-03-29','Sucesso','','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (183,1,'2026-03-31','Parcial','Gerado automaticamente mas enviado manualmente','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (195,2,'2026-03-28','Sucesso','','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (196,2,'2026-03-29','Sucesso','','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (197,2,'2026-03-30','Sucesso','','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (198,2,'2026-03-31','Parcial','Gerado automaticamente mas enviado manualmente','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (199,2,'2026-04-01','Sucesso','','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (210,3,'2026-03-28','Sucesso','','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (211,3,'2026-03-29','Sucesso','','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (212,3,'2026-03-30','Sucesso','','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (213,3,'2026-03-31','Parcial','Funcionou mas não registrou','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (224,4,'2026-03-28','Parcial','17 com mais de 45 dias','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (225,4,'2026-03-29','Parcial','17 com mais de 45 dias','Carga2 1.xlsx','2026-04-01 21:03:47');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (237,4,'2026-04-01','Parcial','19 com mais de 45 dias | Novos: 0, Atrib: 25, Pend: 30',NULL,'2026-04-01 21:30:31');
INSERT IGNORE INTO execucoes (id,rotina_id,data_execucao,status,detalhes,origem_arquivo,data_importacao) VALUES (253,4,'2026-04-02','Parcial','16 com mais de 45 dias | Novos: 0, Atrib: 29, Pend: 26',NULL,'2026-04-02 21:09:31');

ALTER TABLE execucoes AUTO_INCREMENT = 300;

-- INDICADORES GLPI
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (112,'2026-04-01',58,'2026-04-01 15:02:49');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (134,'2026-03-18',66,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (135,'2026-03-19',58,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (136,'2026-03-20',61,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (137,'2026-03-21',61,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (138,'2026-03-22',61,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (139,'2026-03-23',66,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (140,'2026-03-24',56,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (141,'2026-03-25',60,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (142,'2026-03-26',70,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (143,'2026-03-27',50,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (144,'2026-03-28',50,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (145,'2026-03-29',50,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (146,'2026-03-30',54,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (147,'2026-03-31',46,'2026-04-01 21:03:47');
INSERT IGNORE INTO indicadores_glpi (id,data,quantidade,criado_em) VALUES (158,'2026-04-02',60,'2026-04-02 11:16:25');

ALTER TABLE indicadores_glpi AUTO_INCREMENT = 200;

-- IMPORTACOES
INSERT IGNORE INTO importacoes (id,nome_arquivo,data_importacao,registros_inseridos,registros_ignorados,usuario_id) VALUES (1,'Carga2.xlsx','2026-03-29 20:29:48',40,0,1);
INSERT IGNORE INTO importacoes (id,nome_arquivo,data_importacao,registros_inseridos,registros_ignorados,usuario_id) VALUES (2,'Carga2 1.xlsx','2026-04-01 21:03:47',26,34,1);

ALTER TABLE importacoes AUTO_INCREMENT = 10;
ALTER TABLE usuarios    AUTO_INCREMENT = 10;

-- =============================================
-- VERIFICAÇÃO FINAL
-- =============================================
SELECT 'usuarios'         as tabela, COUNT(*) as registros FROM usuarios
UNION ALL
SELECT 'rotinas',          COUNT(*) FROM rotinas
UNION ALL
SELECT 'execucoes',        COUNT(*) FROM execucoes
UNION ALL
SELECT 'indicadores_glpi', COUNT(*) FROM indicadores_glpi
UNION ALL
SELECT 'importacoes',      COUNT(*) FROM importacoes;
