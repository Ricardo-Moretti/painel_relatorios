/**
 * Serviço de Email via n8n Webhook
 * O backend envia dados para o n8n, que dispara o email via SMTP
 * Não precisa de nodemailer — o n8n cuida do envio
 */
require('dotenv').config();
// SECURITY: NODE_TLS_REJECT_UNAUTHORIZED is NOT disabled globally.
// If the n8n server uses a self-signed cert, configure a custom CA instead.

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://automation.tracbel.digital/webhook';
const N8N_RELATORIO_PATH = process.env.N8N_RELATORIO_PATH || '/relatorio-glpi';

const emailService = {

  /** Envia dados para o webhook do n8n */
  async enviarParaN8n(path, dados) {
    const url = `${N8N_WEBHOOK_URL}${path}`;
    console.log(`[Email] Enviando para n8n: ${url}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`n8n webhook falhou (${res.status}): ${err}`);
    }

    console.log('[Email] n8n respondeu:', res.status);
    return true;
  },

  /** Envia relatório diário do GLPI para o n8n */
  async enviarRelatorioDiario(dados) {
    return this.enviarParaN8n(N8N_RELATORIO_PATH, {
      tipo: 'relatorio-diario',
      ...dados,
    });
  },

  /** Envia alerta de rotina (DPM, etc) */
  async enviarAlertaRotina(dados) {
    return this.enviarParaN8n('/alerta-rotina', {
      tipo: 'alerta-rotina',
      ...dados,
    });
  },
};

module.exports = emailService;
