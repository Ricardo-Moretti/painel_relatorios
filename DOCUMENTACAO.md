# Painel de Rotinas — Documentação Completa

## 1. Visão Geral

Sistema SaaS interno para gestão operacional de rotinas de TI, com integração direta ao GLPI via MySQL e análise avançada de SLA. Desenvolvido para exibição em TV 32" e uso pela equipe GLPI_TI.

### Objetivo
- Monitorar rotinas operacionais (DPM, PMM, Garantia, JDPrisma, CGPool, Elipse, ShopDeere, Loja autonoma, GLPI)
- Análise de SLA com regras idênticas ao BI Qlik existente
- Dashboards em tempo real para TV
- Automação de verificações e notificações

### Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React, Vite, Recharts, Zustand | React 19 |
| Backend | Node.js, Express | Node 25.x |
| Banco Local | SQLite (better-sqlite3, WAL mode) | - |
| Banco GLPI | MariaDB (mysql2, read-only) | 10.6 |
| Automação | n8n (Azure) | - |
| Segurança | Helmet, AES-256-GCM, JWT, bcrypt | - |
| Testes | Playwright | - |

---

## 2. Arquitetura

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Frontend       │     │   Backend        │     │   SQLite Local   │
│   React + Vite   │────▶│   Node.js/Express│────▶│   database.sqlite│
│   localhost:5173  │     │   localhost:3001  │     │                  │
└──────────────────┘     └────────┬─────────┘     └──────────────────┘
                                  │
                         ┌────────┴─────────┐
                         │                  │
                    ┌────▼────┐       ┌─────▼─────┐
                    │ MySQL   │       │ Pasta Rede│
                    │ GLPI    │       │ DPM       │
                    │ 10.200  │       │ 192.168   │
                    │ .80.7   │       │ .109.228  │
                    │ (SELECT)│       │ (leitura) │
                    └─────────┘       └───────────┘

┌──────────────────┐
│   n8n (Azure)    │
│   Recebe webhook │──────▶ Envia email via SMTP Office 365
│   do backend     │
└──────────────────┘
```

### Fluxo de Dados
1. Frontend faz requests para API REST (localhost:3001)
2. Backend consulta SQLite local (rotinas, execuções, cache)
3. Backend consulta MySQL do GLPI (somente SELECT, grupo GLPI_TI)
4. Backend verifica pasta de rede DPM (somente leitura)
5. Backend envia dados para n8n via webhook (relatório diário)
6. n8n envia email via SMTP Office 365

---

## 3. Funcionalidades

### 3.1 Dashboard Principal
- KPI Cards com animação count-up e variação vs período anterior
- Tabela de 9 rotinas com status, detalhes, última execução
- Análise multi-período (10d, 30d, 90d, mês) com filtros por status e rotina
- Heatmap 10 dias com todas as rotinas + GLPI badges numéricos
- Dias sem falha (streak por rotina)
- Donut de distribuição de status
- SLA/Disponibilidade com progress bars
- Evolução diária (barras empilhadas)
- Auto-refresh a cada 5 minutos
- Relógio em tempo real no header
- Indicador GLPI online/offline
- Dark mode automático (18h-7h)

### 3.2 GLPI Business Intelligence
- Banner SLA com % e contagem dentro/fora
- KPIs: abertos, solucionados, tempo médio, SLA, médias diárias
- Gráfico abertos vs solucionados por dia
- Donut de status (Novo, Atribuído, Planejado, Pendente)
- Top atendentes com tempo médio
- Top categorias
- Urgências
- SLA gauge + tendência semanal com meta 85%
- Tipo (Incidente vs Requisição)
- Tempo médio por categoria
- Backlog acumulado
- Comparação mês atual vs anterior
- Previsão de fechamento do mês
- Top solicitantes

### 3.3 SLA Detalhado
- SLA Global separado: Solução vs Atendimento (regras Qlik)
- Tempos por etapa (1a resposta, solução, espera)
- SLA por prioridade com metas em horas
- Urgência x Tempo x SLA
- SLA por atendente (ranking com %)
- Top 10 chamados mais antigos (com atendente e dias sem interação)
- Distribuição por hora de abertura
- Volume semanal (abertos vs solucionados)
- Reaberturas (via glpi_itilsolutions)

### 3.4 Explorar Chamados
- Busca por texto (título ou ID)
- Filtros: status, urgência, prioridade, categoria, atendente, período
- Ordenação: recentes, antigos, prioridade, urgência, sem interação
- Rankings: categorias mais requisitadas + atendentes com mais chamados
- Tabela paginada com badge SLA (OK/FORA)
- Toggle "Meus chamados"
- Filtros salvos (localStorage)

### 3.5 Registro Diário
- Preenchimento manual de todas as rotinas
- Botões Sucesso/Fracasso/Parcial para cada rotina
- Campo numérico para GLPI (quantidade de chamados)
- Seletor de data
- Salva tudo de uma vez

### 3.6 Importação Excel
- Upload drag & drop
- Validação: extensão + magic bytes
- Deduplicação automática (rotina + data)
- Mapeamento inteligente de colunas
- GLPI: status numérico tratado como quantidade de chamados
- FRACASSO mapeado para Erro

### 3.7 Histórico
- Heatmap 30 dias por rotina
- Análise mensal consolidada

### 3.8 Alertas
- Erros consecutivos (2+ dias)
- Rotinas sem execução (3+ dias)
- Notificações push no navegador

### 3.9 Relatório Diário por Email
- Backend agenda envio às 17:40 (configurável)
- Dados enviados via webhook para n8n
- n8n monta HTML e envia via SMTP Office 365
- Email inclui: KPIs, status, top categorias, top atendentes
- Destinatários: ricardo.moretti, hugo.rocha, athaide.matos @tracbel.com.br

### 3.10 Exportação
- PNG (html-to-image, 2x pixel ratio)
- PDF (window.print com CSS @media print)

---

## 4. Segurança

### 4.1 Credenciais
| Item | Proteção |
|---|---|
| JWT Secret | AES-256-GCM encriptado no .env |
| MySQL Password | AES-256-GCM encriptado no .env |
| GLPI App Token | AES-256-GCM encriptado no .env |
| GLPI User Token | AES-256-GCM encriptado no .env |
| Chave de encriptação | Derivada de hostname+username (não armazenada) |
| .gitignore | .env, database, uploads, backups excluídos |

### 4.2 Autenticação
| Item | Configuração |
|---|---|
| Algoritmo | JWT HS256 |
| Secret | 96 chars, encriptado |
| Expiração | 2 horas |
| Invalidação | Automática por troca de senha (token_invalidated_at) |
| Bcrypt | 12 rounds |
| Senha mínima | 8 caracteres |
| Senha máxima | 128 caracteres (previne bcrypt DoS) |
| Registro | Apenas admin pode criar usuários |
| Rate limiting | 5 tentativas/min por IP, cleanup automático |

### 4.3 Autorização (RBAC)
| Recurso | User | Admin |
|---|---|---|
| Dashboard (básico) | ✅ | ✅ |
| Dashboard (avançado) | ❌ | ✅ |
| GLPI BI | ❌ | ✅ |
| SLA Detalhado | ❌ | ✅ |
| Explorar Chamados | ❌ | ✅ |
| Registro Diário | ❌ | ✅ |
| Importação Excel | ❌ | ✅ |
| Histórico | ❌ | ✅ |
| Alertas (ver) | ✅ | ✅ |
| Criar rotinas | ❌ | ✅ |
| Webhook | ❌ | ✅ |
| Coleta GLPI | ❌ | ✅ |
| Enviar relatório | ❌ | ✅ |

### 4.4 Proteção de Rede
| Item | Configuração |
|---|---|
| IP Whitelist | Apenas rede interna (172.16.x, 10.x, 192.168.x, localhost) |
| CORS | Whitelist configurável via env, rejeita origens desconhecidas |
| CSRF | Header X-Requested-With obrigatório em POST/PUT/DELETE/PATCH |
| Helmet | CSP (self only), HSTS (1 ano), Referrer Policy strict |
| Body limit | 1MB (previne memory exhaustion) |
| Path traversal | Bloqueio de ../ e variantes encoded |

### 4.5 Proteção de Dados
| Item | Configuração |
|---|---|
| SQLite | secure_delete ON, permissões 600 |
| MySQL GLPI | Somente SELECT, credencial encriptada |
| Perfil API | Nunca retorna senha_hash |
| Error handler | Nunca expõe stack traces |
| Audit log | Todas requisições logadas (IP, método, path, status, duração, user) |
| Log rotation | Automática em 50MB |
| TLS | NODE_TLS_REJECT_UNAUTHORIZED não desabilitado |

### 4.6 Input Validation
| Campo | Validação |
|---|---|
| Email | Regex formato email |
| Senha | 8-128 chars |
| Datas | Regex YYYY-MM-DD |
| Dias/períodos | Min 1, Max 365 |
| Rotina nome | Max 100 chars, string only |
| Detalhes | Max 1000 chars |
| Status | Enum: Sucesso, Erro, Parcial |
| IDs | Inteiro positivo |
| Quantidade | 0-100000 |
| Upload | 5MB max, 1 arquivo, extensão + magic bytes (ZIP/OLE2) |
| Registros batch | Max 100 por request |

### 4.7 Testes de Segurança (Playwright)
```
29/29 testes passaram

✅ Autenticação (6 testes)
   - Login sem credenciais, senha errada, token inválido/manipulado
   - Sem enumeração de usuários (mesma mensagem para email existente/inexistente)

✅ Rate Limiting (1 teste)
   - Bloqueio após 5 tentativas em 60 segundos

✅ SQL Injection (3 testes)
   - Injection no email, query params, webhook — todos bloqueados
   - Prepared statements em 100% das queries

✅ XSS (2 testes)
   - Script tag nos detalhes não executa
   - XSS no email bloqueado

✅ CSRF (2 testes)
   - POST/DELETE sem X-Requested-With → 403

✅ Autorização (2 testes)
   - Registro sem admin → bloqueado
   - Rotas admin sem token → 401

✅ Exposição de Dados (4 testes)
   - Perfil não retorna senha_hash
   - Erros não expõem stack traces
   - GLPI não expõe IPs/credenciais internos
   - Health check retorna apenas status + timestamp

✅ Input Validation (6 testes)
   - Data inválida, dias > 365, ID negativo, nome gigante,
     detalhes > 1000 chars, status inválido — todos rejeitados

✅ File Upload (1 teste)
   - Upload sem arquivo → erro

✅ CORS (1 teste)
   - Origem maliciosa bloqueada

✅ Path Traversal (1 teste)
   - /etc/passwd não acessível
```

---

## 5. Integração GLPI

### Conexão
- Tipo: MySQL direto (somente leitura)
- Host: 10.200.80.7 (rede interna)
- Database: glpidb
- Usuário: encriptado no .env
- Senha: encriptada no .env (AES-256-GCM)

### Filtros
- Grupo: GLPI_TI (ID 1, type=2 atribuído)
- Entidade: exclui PARCEIRO
- Deleted: is_deleted = 0

### Regras SLA (idênticas ao Qlik)

#### SLA Solução excedido:
- `time_to_resolve IS NOT NULL`
- `status ≠ 4` (Pendente excluído)
- `solvedate > time_to_resolve` OU `(solvedate IS NULL AND time_to_resolve < NOW())`

#### SLA Atendimento excedido:
- `time_to_own IS NOT NULL`
- `status ≠ 4`
- `takeintoaccount_delay_stat > TIMESTAMPDIFF(SECOND, date, time_to_own)` OU `(takeintoaccount_delay_stat = 0 AND time_to_own < NOW())`

#### Reaberturas:
- `glpi_itilsolutions.status = 4` (solução recusada)

#### Metas por Prioridade:

| Prioridade | Atendimento | Solução |
|---|---|---|
| 1 - Muito Baixa | 4h | 64h |
| 2 - Baixa | 2h | 32h |
| 3 - Média | 1h45 | 26h |
| 4 - Alta | 1h30 | 20h |
| 5 - Muito Alta | 1h15 | 12h |
| 6 - Crítica | 0h45 | 2h45 |

### Cache Offline
- Dados salvos em tabela `cache_dados` (SQLite)
- Quando MySQL indisponível, retorna último cache
- Indicador visual online/offline no header

### Coleta Automática
- A cada 1 hora via setInterval
- Salva indicadores no SQLite local

---

## 6. Integrações Externas

### 6.1 n8n (Azure)
- URL: https://automation.tracbel.digital/webhook
- Webhook: POST /relatorio-glpi
- Backend envia dados → n8n monta HTML → envia email SMTP
- Email: noreply_agro@tracbel.com.br (Office 365)

### 6.2 DPM (comentado temporariamente)
- Servidor: 192.168.109.228
- Pasta: //192.168.109.228/dtf/dpmext/salva
- Padrão: DLR2JD_DPMEXT_D_201077_YYYYMMDD_HHMMSS.DPM
- Verificação via fs.readdirSync (somente leitura)
- Pendente: acesso n8n Azure → rede interna

---

## 7. Estrutura de Arquivos

```
Painel-de-rotinas/
├── .gitignore
├── playwright.config.js
├── tests/
│   └── security.spec.js          # 29 testes de segurança
├── n8n/
│   ├── fluxo-dpm.json            # Fluxo DPM (comentado)
│   └── fluxo-relatorio-diario.json # Relatório diário por email
├── backend/
│   ├── .env                      # Credenciais encriptadas
│   ├── .gitignore
│   ├── package.json
│   ├── data/
│   │   ├── database.sqlite       # Banco local
│   │   └── audit.log             # Log de auditoria
│   ├── uploads/                  # Arquivos temporários
│   ├── scripts/
│   │   ├── encrypt-env.js        # Encripta valores do .env
│   │   └── testar-glpi.js        # Testa conexão GLPI
│   └── src/
│       ├── server.js             # Express + segurança + agendamentos
│       ├── config/
│       │   ├── database.js       # SQLite + migrations
│       │   ├── crypto.js         # AES-256-GCM encrypt/decrypt
│       │   └── seed.js           # Dados iniciais (9 rotinas)
│       ├── middlewares/
│       │   ├── auth.js           # JWT + token invalidation
│       │   ├── errorHandler.js   # Error sanitization
│       │   ├── ipWhitelist.js    # IP filtering
│       │   └── auditLog.js       # Request logging
│       ├── repositories/
│       │   ├── rotinaRepository.js
│       │   ├── glpiRepository.js
│       │   ├── usuarioRepository.js
│       │   └── importacaoRepository.js
│       ├── services/
│       │   ├── dashboardService.js
│       │   ├── glpiIntegracaoService.js  # MySQL GLPI + cache
│       │   ├── importacaoService.js
│       │   ├── authService.js
│       │   ├── dpmService.js             # Verificação DPM
│       │   └── emailService.js           # Webhook n8n
│       ├── controllers/
│       │   ├── dashboardController.js
│       │   ├── glpiController.js
│       │   ├── rotinaController.js
│       │   ├── importacaoController.js
│       │   ├── authController.js
│       │   └── glpiController.js
│       └── routes/
│           ├── dashboardRoutes.js
│           ├── glpiRoutes.js
│           ├── rotinaRoutes.js
│           ├── importacaoRoutes.js
│           └── authRoutes.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx               # Rotas + RotaAdmin
        ├── index.css             # Design system + responsivo
        ├── services/
        │   └── api.js            # Axios + interceptors
        ├── stores/
        │   ├── authStore.js
        │   ├── themeStore.js     # Dark mode automático
        │   ├── sidebarStore.js
        │   └── toastStore.js
        ├── hooks/
        │   ├── useCountUp.js     # Animação count-up
        │   └── useNotifications.js # Push notifications
        ├── components/
        │   ├── layout/
        │   │   ├── MainLayout.jsx
        │   │   ├── Header.jsx    # Relógio + GLPI indicator
        │   │   └── Sidebar.jsx   # Menu por role
        │   ├── ui/
        │   │   ├── Card.jsx
        │   │   ├── Modal.jsx
        │   │   ├── Toast.jsx
        │   │   └── ExportButton.jsx
        │   ├── dashboard/
        │   │   ├── StatCard.jsx
        │   │   ├── TabelaAnalitica.jsx
        │   │   ├── DiasSemErro.jsx
        │   │   ├── SlaDisponibilidade.jsx
        │   │   └── HistoricoDetalhe.jsx
        │   └── charts/
        │       ├── TemporalChart.jsx
        │       ├── BarrasChart.jsx
        │       ├── PizzaChart.jsx
        │       ├── GlpiLineChart.jsx
        │       ├── TaxaSucessoChart.jsx
        │       ├── GlpiEnvelhecimento.jsx
        │       └── CalendarioHeatmap.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── DashboardPage.jsx
            ├── GlpiPage.jsx
            ├── SlaDetalhadoPage.jsx
            ├── ExplorarChamadosPage.jsx
            ├── RegistroDiarioPage.jsx
            ├── ImportacaoPage.jsx
            ├── HistoricoPage.jsx
            └── AlertasPage.jsx
```

---

## 8. API Endpoints

### Autenticação
| Método | Rota | Auth | Admin | Descrição |
|---|---|---|---|---|
| POST | /api/auth/login | ❌ | - | Login (rate limited) |
| POST | /api/auth/registrar | ✅ | ✅ | Criar usuário |
| GET | /api/auth/perfil | ✅ | - | Dados do perfil |

### Dashboard
| Método | Rota | Auth | Admin | Descrição |
|---|---|---|---|---|
| GET | /api/dashboard | ✅ | - | Dados básicos |
| GET | /api/dashboard/alertas | ✅ | - | Alertas ativos |
| GET | /api/dashboard/avancado | ✅ | ✅ | Streaks, SLA, taxa |
| GET | /api/dashboard/heatmap | ✅ | ✅ | Heatmap N dias |
| GET | /api/dashboard/mensal | ✅ | ✅ | Análise mensal |
| GET | /api/dashboard/rotina/:id/historico | ✅ | ✅ | Histórico rotina |
| GET | /api/dashboard/calendario | ✅ | ✅ | Calendário heatmap |
| GET | /api/dashboard/comparacao | ✅ | ✅ | Comparação períodos |
| GET | /api/dashboard/resumo-multi | ✅ | ✅ | Multi-período |

### GLPI
| Método | Rota | Auth | Admin | Descrição |
|---|---|---|---|---|
| GET | /api/glpi/bi | ✅ | ✅ | BI completo |
| GET | /api/glpi/sla-detalhado | ✅ | ✅ | SLA avançado |
| GET | /api/glpi/explorar | ✅ | ✅ | Pesquisa chamados |
| GET | /api/glpi/filtros | ✅ | ✅ | Filtros disponíveis |
| GET | /api/glpi/comparar-meses | ✅ | ✅ | Mês vs anterior |
| GET | /api/glpi/relatorio-diario | ✅ | ✅ | Métricas do dia |
| POST | /api/glpi/coletar | ✅ | ✅ | Coleta manual |
| POST | /api/glpi/enviar-relatorio | ✅ | ✅ | Enviar para n8n |

### Rotinas
| Método | Rota | Auth | Admin | Descrição |
|---|---|---|---|---|
| GET | /api/rotinas | ✅ | - | Listar rotinas |
| GET | /api/rotinas/:id | ✅ | - | Buscar rotina |
| POST | /api/rotinas | ✅ | ✅ | Criar rotina |
| POST | /api/rotinas/registro-diario | ✅ | ✅ | Registro manual |
| POST | /api/rotinas/webhook | ✅ | ✅ | Webhook n8n |

### Importação
| Método | Rota | Auth | Admin | Descrição |
|---|---|---|---|---|
| POST | /api/importacao/upload | ✅ | ✅ | Upload Excel |
| GET | /api/importacao/historico | ✅ | ✅ | Histórico uploads |

### Público
| Método | Rota | Descrição |
|---|---|---|
| GET | /health | Status do servidor |

---

## 9. Configuração

### Variáveis de Ambiente (.env)
```env
PORT=3001
JWT_SECRET=ENC:...          # Encriptado AES-256-GCM
JWT_EXPIRES_IN=2h
DB_PATH=./data/database.sqlite

# GLPI
GLPI_URL=https://atendimentoagro.tracbel.com.br/apirest.php
GLPI_APP_TOKEN=ENC:...      # Encriptado
GLPI_USER_TOKEN=ENC:...     # Encriptado
GLPI_MYSQL_HOST=10.200.80.7
GLPI_MYSQL_PORT=3306
GLPI_MYSQL_USER=root
GLPI_MYSQL_PASSWORD=ENC:... # Encriptado
GLPI_MYSQL_DATABASE=glpidb

# n8n
N8N_WEBHOOK_URL=https://automation.tracbel.digital/webhook
N8N_RELATORIO_PATH=/relatorio-glpi

# CORS (opcional)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Encriptar credenciais
```bash
cd backend
node scripts/encrypt-env.js
```

### Executar
```bash
# Backend
cd backend && npm install && node src/server.js

# Frontend
cd frontend && npm install && npx vite

# Seed (primeira vez)
cd backend && node src/config/seed.js
```

### Credenciais padrão
- Email: admin@painel.com
- Senha: admin123
- Role: admin

---

## 10. Testes

### Rodar testes de segurança
```bash
cd Painel-de-rotinas
npx playwright test tests/security.spec.js --reporter=list
```

### Resultado esperado
```
29 passed (6.3s)
```

---

## 11. Diferenciais vs BI Atual (Qlik)

| Aspecto | Qlik | Painel de Rotinas |
|---|---|---|
| Atualização | 1x/dia | Tempo real (1h) |
| Exibição TV | Não | Otimizado 32" |
| Registro manual | Não | Sim (9 rotinas) |
| Offline | Não | Cache SQLite |
| Segurança | Básica | AES-256, JWT, CSRF, rate limit |
| SLA regras | Qlik script | Mesmas regras replicadas |
| Alertas | Não | Push + email automático |
| Exploração | Limitada | Filtros avançados + busca |
| Custo | Licença Qlik | Zero (open source) |

---

## 12. Requisitos para Produção

### Infraestrutura
- Servidor Node.js (pode ser a máquina atual ou VM)
- Acesso rede interna ao MySQL GLPI (10.200.80.7:3306)
- Acesso rede interna à pasta DPM (192.168.109.228)
- n8n na Azure (já existe)

### Segurança
- [x] Credenciais encriptadas
- [x] JWT com expiração curta
- [x] Rate limiting
- [x] IP whitelist
- [x] CSRF protection
- [x] Audit logging
- [x] Input validation
- [x] 29/29 testes passando

### Recomendações futuras
- Criar usuário MySQL read-only dedicado (substituir root)
- Configurar HTTPS (certificado SSL)
- Backup automático do SQLite
- Monitoramento de uptime (PM2 ou systemd)
