// Nó: Code — Gerar HTML do Email
// Nodes anteriores necessários:
//   1. "Webhook — Recebe do Backend"  → dados do relatório
//   2. "IA — Buscar Narrativa"         → GET /api/ai/narrativa

const d = $('Webhook — Recebe do Backend').first().json.body
       || $('Webhook — Recebe do Backend').first().json;
const r   = d.resumo     || {};
const st  = d.porStatus  || {};

// Narrativa IA (se o nó existir e retornar com sucesso)
let narrativaHtml = '';
try {
  const iaDados = $('IA — Buscar Narrativa').first().json;
  if (iaDados && iaDados.sucesso && iaDados.narrativa) {
    const texto = iaDados.narrativa.replace(/\n/g, '<br>');
    narrativaHtml = `
      <tr><td style="background:#f0f7ee;padding:28px 44px;border-left:5px solid #367C2B">
        <p style="font-size:11px;font-weight:700;color:#367C2B;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;font-family:Segoe UI,Arial,sans-serif">
          ✨ Análise por Inteligência Artificial
        </p>
        <p style="font-size:14px;color:#1a3a14;line-height:1.75;margin:0;font-family:Segoe UI,Arial,sans-serif">${texto}</p>
      </td></tr>`;
  }
} catch(e) {}

// ── Helpers ──────────────────────────────────────────────────────────────────
const slaCor  = (p) => p >= 80 ? '#059669' : p >= 60 ? '#d97706' : '#dc2626';
const slaBg   = (p) => p >= 80 ? '#ecfdf5' : p >= 60 ? '#fffbeb' : '#fef2f2';
const varAbertos = (r.abertosHoje||0) - (r.abertosOntem||0);
const varSoluc   = (r.solucionadosHoje||0) - (r.solucionadosOntem||0);
const seta    = (v) => v > 0 ? '▲ +'+v : v < 0 ? '▼ '+v : '= 0';
const setCor  = (v, inv) => {
  if (inv)  return v > 0 ? '#dc2626' : v < 0 ? '#059669' : '#64748b';
  return v > 0 ? '#059669' : v < 0 ? '#dc2626' : '#64748b';
};

const kpi = (label, valor, cor, bg) =>
  `<td width="25%" style="padding:4px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="background:${bg};padding:22px 12px;text-align:center;border:1px solid #e2e8f0;border-radius:0">
        <p style="font-size:40px;font-weight:800;color:${cor};margin:0;line-height:1;font-family:Segoe UI,Arial,sans-serif">${valor}</p>
        <p style="font-size:10px;color:#64748b;margin:8px 0 0;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Segoe UI,Arial,sans-serif">${label}</p>
      </td>
    </tr></table>
  </td>`;

const metrica = (emoji, label, valor, cor) =>
  `<tr>
    <td style="padding:14px 24px;font-size:14px;color:#475569;border-bottom:1px solid #e2e8f0;font-family:Segoe UI,Arial,sans-serif">${emoji} ${label}</td>
    <td style="padding:14px 24px;font-size:17px;font-weight:800;text-align:right;color:${cor};border-bottom:1px solid #e2e8f0;font-family:Segoe UI,Arial,sans-serif">${valor}</td>
  </tr>`;

// ── Linhas de categorias ──────────────────────────────────────────────────────
let cats = '';
(d.categoriasHoje || []).forEach((c, i) => {
  const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
  cats += `<tr>
    <td style="padding:12px 24px;font-size:14px;color:#334155;background:${bg};border-bottom:1px solid #e2e8f0;font-family:Segoe UI,Arial,sans-serif">${c.categoria}</td>
    <td style="padding:12px 24px;font-size:16px;font-weight:700;text-align:right;color:#1e293b;background:${bg};border-bottom:1px solid #e2e8f0;font-family:Segoe UI,Arial,sans-serif">${c.qtd}</td>
  </tr>`;
});

// ── Linhas de atendentes ──────────────────────────────────────────────────────
let atds = '';
const medalhas = ['🥇','🥈','🥉'];
(d.atendentesHoje || []).forEach((a, i) => {
  const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
  const m  = medalhas[i] || `${i+1}.`;
  atds += `<tr>
    <td style="padding:12px 24px;font-size:14px;color:#334155;background:${bg};border-bottom:1px solid #e2e8f0;font-family:Segoe UI,Arial,sans-serif">${m} ${a.nome}</td>
    <td style="padding:12px 24px;font-size:16px;font-weight:700;text-align:right;color:#059669;background:${bg};border-bottom:1px solid #e2e8f0;font-family:Segoe UI,Arial,sans-serif">${a.resolvidos} ✓</td>
  </tr>`;
});

// ── HTML Final ────────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#e2e8f0;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e2e8f0;padding:32px 0"><tr><td align="center">
<table width="660" cellpadding="0" cellspacing="0" style="max-width:660px;width:100%">

  <!-- HEADER JOHN DEERE -->
  <tr><td style="background:linear-gradient(135deg,#1D5016 0%,#367C2B 100%);padding:36px 44px;border-radius:0">
    <table width="100%"><tr>
      <td>
        <div style="display:inline-block;background:#FFDE00;padding:6px 14px;border-radius:6px;margin-bottom:14px">
          <span style="font-size:13px;font-weight:900;color:#1D5016;font-family:Segoe UI,Arial,sans-serif;letter-spacing:0.5px">JOHN DEERE</span>
        </div>
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:800;font-family:Segoe UI,Arial,sans-serif">📊 Relatório Diário — TI</h1>
        <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:13px;font-family:Segoe UI,Arial,sans-serif">
          ${d.dataFormatada||'Hoje'} &nbsp;|&nbsp; Grupo GLPI_TI &nbsp;|&nbsp; Tracbel Agro
        </p>
      </td>
      <td style="text-align:right;vertical-align:top">
        <p style="color:#FFDE00;font-size:11px;font-weight:700;margin:0;font-family:Segoe UI,Arial,sans-serif">AUTOMÁTICO</p>
      </td>
    </tr></table>
  </td></tr>

  <!-- NARRATIVA IA -->
  ${narrativaHtml}

  <!-- KPIs PRINCIPAIS -->
  <tr><td style="background:#ffffff;padding:32px 40px 20px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${kpi('ABERTOS', r.abertos||0, '#dc2626', '#fef2f2')}
      ${kpi('SOLUCIONADOS HOJE', r.solucionadosHoje||0, '#059669', '#ecfdf5')}
      ${kpi('NOVOS HOJE', r.abertosHoje||0, '#1e40af', '#eff6ff')}
      ${kpi('SLA SOLUÇÃO', (r.slaPct||0)+'%', slaCor(r.slaPct||0), slaBg(r.slaPct||0))}
    </tr></table>

    <!-- Comparação ontem -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr>
      <td style="padding:10px 16px;text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:0">
        <span style="font-size:12px;color:#64748b;font-family:Segoe UI,Arial,sans-serif">vs Ontem: </span>
        <span style="font-size:13px;font-weight:700;color:${setCor(varAbertos,true)};font-family:Segoe UI,Arial,sans-serif">${seta(varAbertos)} novos</span>
        <span style="font-size:12px;color:#cbd5e1;margin:0 8px">|</span>
        <span style="font-size:13px;font-weight:700;color:${setCor(varSoluc,false)};font-family:Segoe UI,Arial,sans-serif">${seta(varSoluc)} solucionados</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- MÉTRICAS DETALHADAS -->
  <tr><td style="background:#ffffff;padding:4px 40px 28px">
    <h3 style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;font-family:Segoe UI,Arial,sans-serif">📈 Métricas do Dia</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0">
      ${metrica('🎯', 'SLA Atendimento (1ª resposta)', (r.slaAtenPct||0)+'%', slaCor(r.slaAtenPct||0))}
      ${metrica('⏱️', 'Tempo médio de solução', (r.tempoMedioHoje||0)+'h', '#1e40af')}
      ${metrica('⚡', 'Tempo médio 1ª resposta', (r.tempoRespostaHoje||0)+'h', '#7c3aed')}
      ${metrica('🔴', 'Envelhecidos (mais de 45 dias)', r.envelhecidos||0, '#dc2626')}
      ${metrica('🔄', 'Reaberturas hoje', r.reabertosHoje||0, '#d97706')}
      ${metrica('🔒', 'Fechados hoje', r.fechadosHoje||0, '#334155')}
    </table>
  </td></tr>

  <!-- STATUS DOS ABERTOS -->
  <tr><td style="background:#ffffff;padding:4px 40px 28px">
    <h3 style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;font-family:Segoe UI,Arial,sans-serif">📋 Status dos Chamados Abertos</h3>
    <table width="100%" cellpadding="0" cellspacing="4"><tr>
      <td width="25%" style="text-align:center;padding:16px;background:#f8fafc;border:1px solid #e2e8f0">
        <p style="font-size:28px;font-weight:800;color:#334155;margin:0">${st.novos||0}</p>
        <p style="font-size:11px;color:#64748b;margin:6px 0 0;font-family:Segoe UI,Arial,sans-serif">⚪ Novos</p>
      </td>
      <td width="25%" style="text-align:center;padding:16px;background:#f8fafc;border:1px solid #e2e8f0">
        <p style="font-size:28px;font-weight:800;color:#059669;margin:0">${st.atribuidos||0}</p>
        <p style="font-size:11px;color:#64748b;margin:6px 0 0;font-family:Segoe UI,Arial,sans-serif">🟢 Atribuídos</p>
      </td>
      <td width="25%" style="text-align:center;padding:16px;background:#f8fafc;border:1px solid #e2e8f0">
        <p style="font-size:28px;font-weight:800;color:#d97706;margin:0">${st.planejados||0}</p>
        <p style="font-size:11px;color:#64748b;margin:6px 0 0;font-family:Segoe UI,Arial,sans-serif">🟡 Planejados</p>
      </td>
      <td width="25%" style="text-align:center;padding:16px;background:#f8fafc;border:1px solid #e2e8f0">
        <p style="font-size:28px;font-weight:800;color:#dc2626;margin:0">${st.pendentes||0}</p>
        <p style="font-size:11px;color:#64748b;margin:6px 0 0;font-family:Segoe UI,Arial,sans-serif">🟠 Pendentes</p>
      </td>
    </tr></table>
  </td></tr>

  <!-- TOP CATEGORIAS -->
  ${cats ? `<tr><td style="background:#ffffff;padding:4px 40px 28px">
    <h3 style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;font-family:Segoe UI,Arial,sans-serif">📂 Top Categorias do Dia</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0">${cats}</table>
  </td></tr>` : ''}

  <!-- TOP ATENDENTES -->
  ${atds ? `<tr><td style="background:#ffffff;padding:4px 40px 28px">
    <h3 style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;font-family:Segoe UI,Arial,sans-serif">🏆 Top Atendentes do Dia</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0">${atds}</table>
  </td></tr>` : ''}

  <!-- FOOTER -->
  <tr><td style="background:#1D5016;padding:24px 44px;text-align:center">
    <p style="font-size:12px;color:rgba(255,255,255,0.7);margin:0;font-family:Segoe UI,Arial,sans-serif">
      <strong style="color:#FFDE00">Painel de Rotinas TI</strong> &nbsp;·&nbsp; John Deere Tracbel Agro<br>
      Relatório gerado automaticamente — Não responda este email.
    </p>
  </td></tr>

</table></td></tr></table>
</body></html>`;

const assunto = `📊 Relatório TI — ${r.solucionadosHoje||0} solucionados | ${r.abertos||0} abertos | SLA ${r.slaPct||0}% | ${d.dataFormatada||'Hoje'}`;

return [{ json: { html, assunto } }];
