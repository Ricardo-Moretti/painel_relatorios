/**
 * AI Service — integração OpenAI para as 5 features de IA
 * Todas as respostas em português brasileiro
 */
const OpenAI = require('openai');

let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY nao configurada no .env');
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

const aiService = {

  /**
   * Feature 1 — Narrativa para o email diário
   * Gera texto executivo com base nas métricas do dia
   */
  async gerarNarrativa(metricas) {
    const client = getClient();
    const prompt = `Dados do relatório de TI de hoje:
${JSON.stringify(metricas, null, 2)}

Redija uma narrativa executiva em português brasileiro com 3 parágrafos:
1. Situação atual do dia (chamados abertos, solucionados, SLA)
2. Destaques positivos e desempenho da equipe
3. Pontos de atenção e recomendações

Use linguagem profissional e objetiva. Não use markdown, apenas texto puro. Máximo 250 palavras.`;

    const res = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Você é um assistente de TI que redige relatórios executivos em português brasileiro formal, conciso e orientado a resultados.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 600,
      temperature: 0.4,
    });
    return res.choices[0].message.content.trim();
  },

  /**
   * Feature 2 — Detecção de anomalias no histórico de rotinas e GLPI
   * Retorna array de anomalias com severidade
   */
  async detectarAnomalias(historico) {
    const client = getClient();
    const prompt = `Analise os dados operacionais de TI abaixo e identifique anomalias.

${JSON.stringify(historico, null, 2)}

Retorne um JSON válido com a chave "anomalias" contendo um array de objetos. Cada objeto deve ter:
- "tipo": tipo da anomalia (ex: "Falha consecutiva", "Volume anormal", "Rotina parada")
- "descricao": descrição clara em português do que foi detectado
- "severidade": "alta", "media" ou "baixa"
- "rotina": nome da rotina ou sistema afetado (ou "GLPI" ou "Geral")

Se não houver anomalias, retorne {"anomalias": []}.
Retorne SOMENTE o JSON, sem explicações adicionais.`;

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um analista de dados de TI especializado em detecção de anomalias operacionais.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800,
      temperature: 0.2,
    });

    try {
      const parsed = JSON.parse(res.choices[0].message.content);
      return parsed.anomalias || [];
    } catch {
      return [];
    }
  },

  /**
   * Feature 3 — Chat com os dados do painel
   * Responde perguntas em português com base no snapshot atual
   */
  async responderChat(pergunta, snapshot) {
    const client = getClient();

    const systemPrompt = `Você é a assistente de inteligência artificial do Painel de Rotinas TI da John Deere Tracbel.

SOBRE O PRODUTO:
O Painel de Rotinas é um sistema de monitoramento operacional de TI que acompanha:
- ROTINAS DE TI: processos automatizados diários como DPM (Document Production Manager), PMM (Preventive Maintenance Management), Garantia, JDPrisma (sistema JD), CGPool (pool de conexões), Elipse (SCADA), ShopDeere, Loja Autônoma e GLPI. Cada rotina tem status: Sucesso, Erro ou Parcial.
- GLPI: sistema de chamados de TI (helpdesk). Monitoramos chamados abertos, solucionados, envelhecidos (mais de 45 dias sem solução), SLA (meta de atendimento dentro do prazo), top atendentes, categorias mais frequentes.
- SLA: percentual de chamados resolvidos dentro do prazo. Meta ideal acima de 80%. Calculado sobre tickets do grupo GLPI_TI excluindo entidades parceiras.
- ENVELHECIDOS: chamados abertos há mais de 45 dias, indicador crítico de backlog.
- RELATÓRIO DIÁRIO: enviado às 17:40 de segunda a sexta com resumo do dia.

PÁGINAS DO PAINEL:
1. Dashboard — status das rotinas em grade (bolinhas coloridas por dia), KPIs, heatmap 10 dias
2. GLPI BI — análise completa de chamados: abertos, SLA, tempo médio, top atendentes, categorias, tendência
3. SLA Detalhado — análise profunda de SLA por prioridade, atendente, tempo de resposta
4. Explorar Chamados — busca e filtros avançados nos chamados GLPI
5. Registro Diário — inserção manual de status de rotinas
6. Importação Excel — upload de planilhas com histórico de rotinas
7. Histórico — calendário e análise mensal das rotinas

ESTRUTURA DOS DADOS NO SNAPSHOT:
- snapshot.glpiHoje — dados de HOJE (SEMPRE presente): abertos, envelhecidos, abertosHoje, solucionadosHoje, abertosOntem, solucionadosOntem, slaSolucaoHoje (percentual, total, dentroPrazo, foraPrazo, status), slaAtendimentoHoje (percentual, total, foraPrazo, status), porStatus (novos, atribuidos, planejados, pendentes), tempoMedioSolucaoHoje, chamadosEnvelhecidos (array: id, titulo, diasAberto, solicitante)
- snapshot.rotinas — status das rotinas automatizadas: ultimaExecucaoCadaRotina, alertas (errosConsecutivos, rotinasSemExecucao)
- snapshot.glpiUltimos7Dias — histórico dos últimos 7 dias (data, quantidade, envelhecidos)

REGRAS DE RESPOSTA:
- Responda SEMPRE em português brasileiro, de forma direta e objetiva (máximo 4 parágrafos curtos)
- Use snapshot.glpiHoje como fonte primária para dados de hoje
- Se slaSolucaoHoje.status = "BOM" → ≥80%, "ALERTA" → 60-79%, "CRITICO" → <60%
- Para listar envelhecidos: use snapshot.glpiHoje.chamadosEnvelhecidos — liste id + título + dias aberto
- Formate números com separadores (ex: 1.234) e percentuais com uma casa decimal
- NUNCA diga que não tem dados de SLA ou envelhecidos — eles sempre estão no snapshot`;

    const prompt = `DADOS ATUAIS DO PAINEL (${snapshot.dataHoje}):
${JSON.stringify(snapshot, null, 2)}

PERGUNTA: ${pergunta}`;

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });
    return res.choices[0].message.content.trim();
  },

  /**
   * Feature 4 — Agrupamento inteligente de chamados GLPI abertos
   * Agrupa por tema real (não apenas categoria cadastrada)
   */
  async resumirChamados(titulos) {
    const client = getClient();
    const prompt = `Analise os títulos de chamados de TI abertos abaixo e agrupe-os por tema real.

Títulos dos chamados:
${titulos.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Retorne um JSON válido com a chave "grupos" contendo um array de objetos, cada um com:
- "tema": nome do tema/categoria identificado (ex: "Problemas com impressora", "Acesso a sistemas", "Lentidão de rede")
- "quantidade": número de chamados neste tema
- "exemplos": array com até 3 títulos representativos do grupo

Agrupe de forma inteligente, máximo 8 grupos. Retorne SOMENTE o JSON.`;

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um analista de TI que categoriza chamados de suporte por tema.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
      temperature: 0.2,
    });

    try {
      const parsed = JSON.parse(res.choices[0].message.content);
      return parsed.grupos || [];
    } catch {
      return [];
    }
  },

  /**
   * Feature 5 — Previsão de volume de chamados para os próximos 7 dias
   * Usa histórico de 90 dias para identificar padrões
   */
  async preverVolume(historico90d) {
    const client = getClient();
    const hoje = new Date();
    const proximos7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(d.getDate() + i + 1);
      return d.toISOString().split('T')[0];
    });

    const prompt = `Com base no histórico de chamados de TI abertos abaixo, preveja o volume para os próximos 7 dias.

Histórico (últimos 90 dias):
${JSON.stringify(historico90d)}

Datas para prever: ${proximos7.join(', ')}

Identifique padrões (dia da semana, picos mensais, tendências) e retorne um JSON válido com a chave "previsao" contendo um array de 7 objetos, cada um com:
- "data": a data no formato YYYY-MM-DD
- "previsao": número inteiro previsto de chamados abertos
- "confianca": "alta", "media" ou "baixa"

Retorne SOMENTE o JSON.`;

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um analista de dados especializado em séries temporais e previsão de demanda de TI.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 400,
      temperature: 0.1,
    });

    try {
      const parsed = JSON.parse(res.choices[0].message.content);
      return parsed.previsao || [];
    } catch {
      return [];
    }
  },
};

module.exports = aiService;
