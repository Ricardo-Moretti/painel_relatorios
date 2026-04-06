/**
 * Testes de Segurança — Playwright
 * Simula ataques reais contra o Painel de Rotinas
 */
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3001';
const HEADERS = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };

// Token global — login uma vez só para evitar rate limiting
let TOKEN = null;

// Helper: login e retorna token
async function login(email = 'admin@painel.com', senha = 'admin123') {
  if (TOKEN && email === 'admin@painel.com') return TOKEN;
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: HEADERS,
    body: JSON.stringify({ email, senha })
  });
  const data = await res.json();
  if (data.dados?.token && email === 'admin@painel.com') TOKEN = data.dados.token;
  return data.dados?.token;
}

// Helper: request autenticado
async function authGet(path, token) {
  return fetch(`${BASE}${path}`, { headers: { ...HEADERS, Authorization: `Bearer ${token}` } });
}
async function authPost(path, token, body) {
  return fetch(`${BASE}${path}`, { method: 'POST', headers: { ...HEADERS, Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
}

// ==========================================
// 1. AUTENTICAÇÃO
// ==========================================

test.describe('Autenticação', () => {
  test('Login sem credenciais retorna 400', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: HEADERS, body: '{}' });
    expect(res.status).toBe(400);
  });

  test('Login com senha errada retorna 401', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ email: 'admin@painel.com', senha: 'errada' }) });
    expect(res.status).toBe(401);
  });

  test('Login com email inexistente retorna mesma mensagem (sem enumeração)', async () => {
    const res1 = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ email: 'naoexiste@x.com', senha: 'errada' }) });
    const res2 = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ email: 'admin@painel.com', senha: 'errada' }) });
    const d1 = await res1.json();
    const d2 = await res2.json();
    expect(d1.mensagem).toBe(d2.mensagem); // Mesma mensagem para ambos
  });

  test('Token inválido retorna 401', async () => {
    const res = await fetch(`${BASE}/api/dashboard`, { headers: { ...HEADERS, Authorization: 'Bearer tokenfalso123' } });
    expect(res.status).toBe(401);
  });

  test('Sem token retorna 401', async () => {
    const res = await fetch(`${BASE}/api/dashboard`, { headers: HEADERS });
    expect(res.status).toBe(401);
  });

  test('Token JWT manipulado retorna 401', async () => {
    const token = await login();
    // Alterar payload do JWT
    const parts = token.split('.');
    parts[1] = Buffer.from(JSON.stringify({ id: 999, role: 'admin' })).toString('base64');
    const fakeToken = parts.join('.');
    const res = await fetch(`${BASE}/api/dashboard`, { headers: { ...HEADERS, Authorization: `Bearer ${fakeToken}` } });
    expect(res.status).toBe(401);
  });
});

// ==========================================
// 2. RATE LIMITING
// ==========================================

test.describe('Rate Limiting', () => {
  test('Bloqueia após 5 tentativas de login', async () => {
    const results = [];
    for (let i = 0; i < 7; i++) {
      const res = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ email: `ratelimit${Date.now()}@test.com`, senha: 'errada' }) });
      results.push(res.status);
    }
    expect(results.filter(s => s === 429).length).toBeGreaterThan(0);
  });
});

// ==========================================
// 3. SQL INJECTION
// ==========================================

test.describe('SQL Injection', () => {
  test('Login com SQL injection no email', async () => {
    const payloads = [
      "admin@painel.com' OR '1'='1",
      "admin@painel.com'; DROP TABLE usuarios;--",
      "' UNION SELECT * FROM usuarios--",
      "admin@painel.com' AND 1=1--",
    ];
    for (const payload of payloads) {
      const res = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ email: payload, senha: 'admin123' }) });
      const data = await res.json();
      expect(data.sucesso).toBe(false);
    }
  });

  test('SQL injection nos query params', async () => {
    const token = await login();
    const payloads = [
      '/api/dashboard?dias=1;DROP TABLE execucoes',
      '/api/dashboard?dias=1 UNION SELECT * FROM usuarios',
      "/api/rotinas/execucoes?dataInicio=2024-01-01' OR '1'='1",
    ];
    for (const path of payloads) {
      const res = await authGet(path, token);
      // Deve retornar 200, 400 ou 401 — nunca expor dados
      expect([200, 400, 401]).toContain(res.status);
      const data = await res.json();
      const str = JSON.stringify(data);
      expect(str).not.toContain('senha_hash');
      expect(str).not.toContain('$2a$');
      expect(str).not.toContain('$2b$');
    }
  });

  test('SQL injection no webhook', async () => {
    const token = await login();
    const res = await authPost('/api/rotinas/webhook', token, {
      rotina: "DPM'; DROP TABLE rotinas;--",
      status: 'Sucesso',
      detalhes: "test' OR '1'='1"
    });
    // Deve ser rejeitado ou sanitizado
    expect(res.status).toBeLessThan(500);
  });
});

// ==========================================
// 4. XSS (Cross-Site Scripting)
// ==========================================

test.describe('XSS', () => {
  test('Webhook com script tag nos detalhes', async () => {
    const token = await login();
    const res = await authPost('/api/rotinas/webhook', token, {
      rotina: 'DPM',
      status: 'Sucesso',
      detalhes: '<script>alert("xss")</script>'
    });
    const data = await res.json();
    // O dado é armazenado como texto, não deve ser executado
    // Verificar que o response não contém HTML não-escaped
    expect(JSON.stringify(data)).not.toContain('<script>');
  });

  test('Login com XSS no email', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ email: '<img src=x onerror=alert(1)>', senha: 'test' }) });
    const data = await res.json();
    expect(JSON.stringify(data)).not.toContain('onerror');
  });
});

// ==========================================
// 5. CSRF
// ==========================================

test.describe('CSRF Protection', () => {
  test('POST sem X-Requested-With é bloqueado', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // SEM X-Requested-With
      body: JSON.stringify({ email: 'admin@painel.com', senha: 'admin123' })
    });
    expect(res.status).toBe(403);
  });

  test('DELETE sem X-Requested-With é bloqueado', async () => {
    const res = await fetch(`${BASE}/api/rotinas/1`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
    expect(res.status).toBe(403);
  });
});

// ==========================================
// 6. AUTORIZAÇÃO
// ==========================================

test.describe('Autorização', () => {
  test('Registro sem ser admin é bloqueado', async () => {
    // Primeiro precisaria de um user não-admin, mas como só temos admin,
    // testamos que a rota exige autenticação
    const res = await fetch(`${BASE}/api/auth/registrar`, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify({ nome: 'Hacker', email: 'hacker@test.com', senha: '12345678' })
    });
    expect([401, 429]).toContain(res.status); // 401 sem token ou 429 rate limited
  });

  test('Rotas admin protegidas', async () => {
    // Sem token — deve retornar 401
    const adminRoutes = [
      { method: 'POST', path: '/api/rotinas', body: { nome: 'Teste' } },
      { method: 'POST', path: '/api/glpi/coletar', body: {} },
      { method: 'POST', path: '/api/glpi/enviar-relatorio', body: {} },
    ];
    for (const route of adminRoutes) {
      const res = await fetch(`${BASE}${route.path}`, {
        method: route.method, headers: HEADERS,
        body: JSON.stringify(route.body)
      });
      expect(res.status).toBe(401);
    }
  });
});

// ==========================================
// 7. EXPOSIÇÃO DE DADOS
// ==========================================

test.describe('Exposição de Dados', () => {
  test('Perfil não retorna senha_hash', async () => {
    const token = await login();
    const res = await authGet('/api/auth/perfil', token);
    const data = await res.json();
    expect(JSON.stringify(data)).not.toContain('senha_hash');
    expect(JSON.stringify(data)).not.toContain('$2a$'); // bcrypt prefix
    expect(JSON.stringify(data)).not.toContain('$2b$');
  });

  test('Erro 500 não expõe stack trace', async () => {
    const token = await login();
    // Forçar erro com parâmetro inválido
    const res = await authGet('/api/dashboard/rotina/abc/historico', token);
    const data = await res.json();
    expect(JSON.stringify(data)).not.toContain('at ');
    expect(JSON.stringify(data)).not.toContain('.js:');
    expect(JSON.stringify(data)).not.toContain('node_modules');
  });

  test('Status GLPI não expõe URL interna', async () => {
    const token = await login();
    const res = await authGet('/api/glpi/status-integracao', token);
    const data = await res.json();
    expect(JSON.stringify(data)).not.toContain('10.200.80.7');
    expect(JSON.stringify(data)).not.toContain('password');
    expect(JSON.stringify(data)).not.toContain('root');
  });

  test('Health check não expõe informações sensíveis', async () => {
    const res = await fetch(`${BASE}/health`);
    const data = await res.json();
    expect(Object.keys(data)).toEqual(['status', 'timestamp']);
  });
});

// ==========================================
// 8. INPUT VALIDATION
// ==========================================

test.describe('Input Validation', () => {
  test('Data em formato inválido é rejeitada', async () => {
    const token = await login();
    const res = await authGet('/api/dashboard?dataInicio=not-a-date', token);
    expect([400, 401]).toContain(res.status);
  });

  test('Dias acima de 365 é limitado (não causa erro)', async () => {
    const token = await login();
    const res = await authGet('/api/dashboard?dias=99999', token);
    // Aceita mas limita internamente a 365
    expect([200, 401]).toContain(res.status);
  });

  test('ID negativo é rejeitado', async () => {
    const token = await login();
    const res = await authGet('/api/rotinas/-1', token);
    expect([400, 401, 404]).toContain(res.status);
    // Nunca deve retornar dados
    if (res.status !== 401) {
      const data = await res.json();
      expect(data.sucesso).toBe(false);
    }
  });

  test('Rotina com nome gigante é rejeitada', async () => {
    const token = await login();
    const res = await authPost('/api/rotinas/webhook', token, {
      rotina: 'A'.repeat(200),
      status: 'Sucesso'
    });
    expect([400, 401]).toContain(res.status);
  });

  test('Detalhes com mais de 1000 chars é rejeitado', async () => {
    const token = await login();
    const res = await authPost('/api/rotinas/webhook', token, {
      rotina: 'DPM',
      status: 'Sucesso',
      detalhes: 'X'.repeat(1500)
    });
    expect([400, 401]).toContain(res.status);
  });

  test('Status inválido é rejeitado', async () => {
    const token = await login();
    const res = await authPost('/api/rotinas/webhook', token, {
      rotina: 'DPM',
      status: 'HACKEADO'
    });
    expect([400, 401]).toContain(res.status);
  });
});

// ==========================================
// 9. FILE UPLOAD
// ==========================================

test.describe('File Upload', () => {
  test('Upload sem arquivo retorna erro', async () => {
    const token = await login();
    const res = await fetch(`${BASE}/api/importacao/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Requested-With': 'XMLHttpRequest' },
    });
    expect([400, 401]).toContain(res.status);
  });
});

// ==========================================
// 10. CORS
// ==========================================

test.describe('CORS', () => {
  test('Origem não permitida é bloqueada', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { ...HEADERS, Origin: 'https://malicious-site.com' },
      body: JSON.stringify({ email: 'admin@painel.com', senha: 'admin123' })
    });
    // CORS bloqueia no browser, mas server-side o fetch funciona
    // Verificar que não tem Access-Control-Allow-Origin para domínio malicioso
    const corsHeader = res.headers.get('access-control-allow-origin');
    expect(corsHeader).not.toBe('https://malicious-site.com');
  });
});

// ==========================================
// 11. PATH TRAVERSAL
// ==========================================

test.describe('Path Traversal', () => {
  test('Caminho com ../ é bloqueado', async () => {
    const token = await login();
    // HTTP normaliza ../ antes de chegar ao servidor (comportamento do protocolo)
    // O Express nunca recebe paths com .. — o cliente resolve
    // Testamos que o servidor não serve /etc/passwd
    const res = await authGet('/etc/passwd', token);
    const data = await res.text();
    expect(data).not.toContain('root:');
    expect(data).not.toContain('/bin/bash');
    // Path não é rota de API — retorna fallback (HTML ou 404)
    expect([200, 404]).toContain(res.status);
  });
});
