/**
 * Script para testar conexão GLPI e listar campos do Ticket
 *
 * Uso:
 *   node scripts/testar-glpi.js
 *
 * Antes de rodar, preencha no .env:
 *   GLPI_USER=seu_usuario
 *   GLPI_PASSWORD=sua_senha
 *   (ou GLPI_USER_TOKEN=seu_token)
 */
require('dotenv').config();
// WARNING: NODE_TLS_REJECT_UNAUTHORIZED is NOT disabled.
// If the GLPI server uses a self-signed cert, use a custom CA or pass --insecure flag manually.

const { getSecureEnv } = require('../src/config/crypto');

const GLPI_URL = process.env.GLPI_URL;
const GLPI_APP_TOKEN = getSecureEnv('GLPI_APP_TOKEN');
const GLPI_USER_TOKEN = getSecureEnv('GLPI_USER_TOKEN');
const GLPI_USER = process.env.GLPI_USER;
const GLPI_PASSWORD = getSecureEnv('GLPI_PASSWORD');

async function main() {
  console.log('=== Teste de Conexão GLPI ===\n');
  console.log('URL:', GLPI_URL);
  console.log('Auth:', GLPI_USER_TOKEN ? 'User Token' : GLPI_USER ? `Basic (${GLPI_USER})` : 'NÃO CONFIGURADO');
  console.log('App-Token:', GLPI_APP_TOKEN && GLPI_APP_TOKEN !== 'SEU_APP_TOKEN_AQUI' ? 'Sim' : 'Não');
  console.log('');

  // Montar headers
  const headers = { 'Content-Type': 'application/json' };
  if (GLPI_APP_TOKEN && GLPI_APP_TOKEN !== 'SEU_APP_TOKEN_AQUI') {
    headers['App-Token'] = GLPI_APP_TOKEN;
  }
  if (GLPI_USER_TOKEN) {
    headers['Authorization'] = `user_token ${GLPI_USER_TOKEN}`;
  } else if (GLPI_USER && GLPI_PASSWORD) {
    headers['Authorization'] = `Basic ${Buffer.from(`${GLPI_USER}:${GLPI_PASSWORD}`).toString('base64')}`;
  } else {
    console.log('ERRO: Configure GLPI_USER + GLPI_PASSWORD ou GLPI_USER_TOKEN no .env');
    process.exit(1);
  }

  // 1. Iniciar sessão
  console.log('1. Iniciando sessão...');
  let sessionToken;
  try {
    const res = await fetch(`${GLPI_URL}/initSession`, { method: 'GET', headers });
    if (!res.ok) {
      const err = await res.text();
      console.log(`   FALHOU (${res.status}): ${err}`);
      process.exit(1);
    }
    const data = await res.json();
    sessionToken = data.session_token;
    console.log(`   OK — Session Token: ${sessionToken.substring(0, 10)}...`);
  } catch (e) {
    console.log(`   ERRO: ${e.message}`);
    process.exit(1);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Session-Token': sessionToken,
  };
  if (GLPI_APP_TOKEN && GLPI_APP_TOKEN !== 'SEU_APP_TOKEN_AQUI') {
    authHeaders['App-Token'] = GLPI_APP_TOKEN;
  }

  // 2. Listar campos do Ticket
  console.log('\n2. Campos do Ticket (SearchOptions):');
  try {
    const res = await fetch(`${GLPI_URL}/listSearchOptions/Ticket`, { method: 'GET', headers: authHeaders });
    const campos = await res.json();

    // Filtrar campos importantes
    const importantes = {};
    for (const [id, campo] of Object.entries(campos)) {
      if (typeof campo === 'object' && campo.name) {
        const nome = campo.name.toLowerCase();
        if (nome.includes('status') || nome.includes('date') || nome.includes('data') ||
            nome.includes('open') || nome.includes('close') || nome.includes('solv') ||
            nome.includes('creat') || nome.includes('title') || nome.includes('name') ||
            nome.includes('id') || nome.includes('categ') || nome.includes('urg') ||
            nome.includes('prior') || nome.includes('type')) {
          importantes[id] = campo.name;
        }
      }
    }

    console.log('   Campos relevantes:');
    Object.entries(importantes).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).forEach(([id, nome]) => {
      console.log(`   ID ${id.padStart(3)} = ${nome}`);
    });
  } catch (e) {
    console.log(`   ERRO: ${e.message}`);
  }

  // 3. Contar chamados abertos (status < 5)
  console.log('\n3. Chamados não solucionados (status < 5):');
  try {
    const url = new URL(`${GLPI_URL}/search/Ticket`);
    url.searchParams.append('criteria[0][field]', '12');
    url.searchParams.append('criteria[0][searchtype]', 'lessthan');
    url.searchParams.append('criteria[0][value]', '5');
    url.searchParams.append('range', '0-0');
    url.searchParams.append('forcedisplay[0]', '2');

    const res = await fetch(url.toString(), { method: 'GET', headers: authHeaders });
    const data = await res.json();
    console.log(`   Total: ${data.totalcount || 0} chamados abertos`);
  } catch (e) {
    console.log(`   ERRO: ${e.message}`);
  }

  // 4. Chamados com mais de 45 dias
  console.log('\n4. Chamados com mais de 45 dias:');
  try {
    const data45 = new Date();
    data45.setDate(data45.getDate() - 45);
    const dataStr = data45.toISOString().split('T')[0];

    const url = new URL(`${GLPI_URL}/search/Ticket`);
    url.searchParams.append('criteria[0][field]', '12');
    url.searchParams.append('criteria[0][searchtype]', 'lessthan');
    url.searchParams.append('criteria[0][value]', '5');
    url.searchParams.append('criteria[1][field]', '15');
    url.searchParams.append('criteria[1][searchtype]', 'lessthan');
    url.searchParams.append('criteria[1][value]', dataStr);
    url.searchParams.append('criteria[1][link]', 'AND');
    url.searchParams.append('range', '0-0');
    url.searchParams.append('forcedisplay[0]', '2');

    const res = await fetch(url.toString(), { method: 'GET', headers: authHeaders });
    const data = await res.json();
    console.log(`   Total: ${data.totalcount || 0} chamados com mais de 45 dias`);
  } catch (e) {
    console.log(`   ERRO: ${e.message}`);
  }

  // 5. Encerrar sessão
  console.log('\n5. Encerrando sessão...');
  try {
    await fetch(`${GLPI_URL}/killSession`, { method: 'GET', headers: authHeaders });
    console.log('   OK');
  } catch (e) { /* silencioso */ }

  console.log('\n=== Teste finalizado ===');
}

main().catch(e => console.error('Erro geral:', e.message));
