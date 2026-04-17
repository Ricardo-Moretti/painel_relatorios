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
  async gerarNarrativa(metricas, historico10d = []) {
    const client = getClient();

    // Analisa tendência dos 10 dias
    let tendenciaTexto = '';
    if (historico10d.length >= 2) {
      const qtds = historico10d.map(d => parseInt(d.quantidade) || 0);
      const envs = historico10d.map(d => parseInt(d.envelhecidos) || 0);
      const mediaQtd = (qtds.reduce((a, b) => a + b, 0) / qtds.length).toFixed(0);
      const primeiros5 = qtds.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const ultimos5   = qtds.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const tendencia  = ultimos5 > primeiros5 * 1.1 ? 'crescente' : ultimos5 < primeiros5 * 0.9 ? 'decrescente' : 'estável';
      const maxEnv     = Math.max(...envs);
      const minEnv     = Math.min(...envs);
      tendenciaTexto = `\n\nHistórico últimos ${historico10d.length} dias:\n${JSON.stringify(historico10d.map(d => ({ data: d.data, abertos: d.quantidade, envelhecidos: d.envelhecidos })), null, 2)}\nMédia de abertos: ${mediaQtd} | Tendência: ${tendencia} | Envelhecidos: min ${minEnv}, max ${maxEnv}`;
    }

    const prompt = `Dados do relatório de TI de hoje:
${JSON.stringify(metricas, null, 2)}${tendenciaTexto}

Redija uma narrativa executiva em português brasileiro com 3 parágrafos:
1. Situação atual do dia (chamados abertos, solucionados, SLA)
2. Análise da tendência dos últimos 10 dias — destaque se houve melhora, piora ou estabilidade no volume de chamados e nos envelhecidos. Use dados concretos.
3. Pontos de atenção prioritários e recomendações objetivas

Use linguagem profissional. Não use markdown, apenas texto puro. Máximo 280 palavras.`;

    const res = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Você é um analista de TI que redige relatórios executivos em português brasileiro formal, conciso e orientado a resultados. Quando tiver dados históricos, destaque tendências com números concretos.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 650,
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

    const systemPrompt = `Você é o assistente de inteligência artificial do Painel de Rotinas TI da John Deere Tracbel. Você é um especialista completo em todos os dados e métricas do painel. Responda sempre em português brasileiro, de forma direta e objetiva.

═══════════════════════════════════════
SOBRE O SISTEMA
═══════════════════════════════════════
O Painel de Rotinas monitora operações de TI da John Deere Tracbel em duas frentes:
1. ROTINAS AUTOMATIZADAS — processos diários de TI com status Sucesso/Erro/Parcial
2. GLPI — sistema de chamados de helpdesk (suporte de TI)

═══════════════════════════════════════
ROTINAS DE TI MONITORADAS
═══════════════════════════════════════
Cada rotina tem execução diária e status: Sucesso (verde), Erro (vermelho), Parcial (amarelo).

- DPM (Document Production Manager): geração automática de documentos fiscais/comerciais
- PMM (Preventive Maintenance Management): gestão de manutenção preventiva de equipamentos
- Garantia: processamento de garantias John Deere com a montadora
- JDPrisma: sincronização com o sistema central da John Deere (ERP)
- CGPool: gerenciamento de pool de conexões de banco de dados
- Elipse: sistema SCADA de automação industrial
- ShopDeere: integração com plataforma de e-commerce John Deere
- Loja Autônoma: automação da loja autônoma de peças
- GLPI: automação de coleta de métricas do helpdesk

ALERTAS de rotinas:
- Erros consecutivos: rotina com 2+ dias de erro seguidos = crítico
- Sem execução: rotina não executada há 3+ dias = atenção

═══════════════════════════════════════
GLPI — CONCEITOS E MÉTRICAS
═══════════════════════════════════════
CHAMADOS: tickets de suporte do grupo GLPI_TI (excluindo entidades parceiras).

Status dos chamados:
- Novos (status=1): abertos mas sem atendente
- Atribuídos (status=2): com atendente designado
- Planejados (status=3): agendados para atendimento
- Pendentes (status=4): aguardando resposta do solicitante
- Solucionados (status=5): resolvidos aguardando confirmação
- Fechados (status=6): encerrados definitivamente

ENVELHECIDOS: chamados abertos há mais de 45 dias sem solução. Indicador crítico de backlog acumulado. Meta: zero envelhecidos.

SLA (Service Level Agreement):
- SLA Solução: % de chamados resolvidos dentro do prazo contratual. Meta: ≥80% = BOM, 60-79% = ALERTA, <60% = CRÍTICO
- SLA Atendimento (1º contato): % de chamados que receberam primeiro atendimento dentro do prazo. Mesma escala.
- Cálculo Qlik: exclui chamados pendentes (status=4), inclui abertos que ultrapassaram o prazo mesmo não solucionados
- Fórmula: (total - fora_prazo) / total × 100

PRIORIDADES dos chamados: 1=Muito baixa, 2=Baixa, 3=Média, 4=Alta, 5=Muito alta

TEMPO MÉDIO DE SOLUÇÃO: média em horas do campo solve_delay_stat (tempo desde abertura até solução)
TEMPO MÉDIO DE ATENDIMENTO: média em horas do campo takeintoaccount_delay_stat (tempo até 1º contato)

═══════════════════════════════════════
PÁGINAS DO PAINEL — O QUE CADA UMA MOSTRA
═══════════════════════════════════════

📊 DASHBOARD (página inicial /)
- Grade de status das rotinas: cada rotina × cada dia dos últimos 10 dias (bolinhas coloridas)
- KPIs animados: total de execuções, taxa de sucesso (%), dias sem erro, SLA GLPI
- Heatmap 10 dias: intensidade de erros por rotina/dia
- Tabela analítica: lista de rotinas com status, streak de sucesso, última execução
- Resumo multi-período: comparativo 10 dias / 30 dias / 90 dias / mês atual
- Comparação com período anterior: tendência (melhorou/piorou)
- Tendência GLPI: gráfico de chamados abertos e envelhecidos nos últimos 90 dias
- Banner de anomalias: IA detecta padrões anormais automaticamente

🖥️ GLPI BI (/glpi)
- KPIs principais: total abertos, envelhecidos, solucionados hoje, fechados hoje, SLA%
- Gauge de SLA (velocímetro): verde/amarelo/vermelho
- Comparativo mês atual vs mês anterior
- Evolução diária: gráfico linha de abertos e solucionados por dia no período
- Top 10 atendentes: quem mais resolveu chamados
- Top 10 categorias: tipos mais frequentes de chamados abertos
- Distribuição por urgência: pizza com proporção por nível
- Tipo de chamado: incidentes vs requisições
- Tempo médio por categoria: quais categorias demoram mais para resolver
- Backlog acumulado: saldo diário de abertos vs solucionados
- Categorias específicas: VPN, Reset de Senha (JD/AD/Email/TOTVS), Gestão de Acesso, Permissões
- Painel IA: agrupamento semântico de chamados + previsão próximos 7 dias

🎯 SLA DETALHADO (/sla)
- Dois gauges lado a lado: SLA Solução % e SLA Atendimento %
- SLA por prioridade: breakdown de dentro/fora do prazo por nível (muito baixa até muito alta)
- SLA por atendente: quem mais cumpre/descumpre SLA
- Distribuição urgência × tempo: correlação entre urgência e tempo de resolução
- Top 10 mais antigos: lista dos chamados abertos há mais tempo
- Distribuição por hora: em quais horários os chamados chegam
- Volume por dia da semana: padrão semanal de abertura de chamados

🔍 EXPLORAR CHAMADOS (/explorar)
- Busca textual no título dos chamados
- Filtros: categoria, atendente, status, urgência, prioridade, período (dias)
- Filtro "Meus Chamados": mostra apenas do usuário logado
- Filtros salvos: salva combinações de filtros no localStorage
- Paginação: 30 por página
- Ordenação: por data, urgência, prioridade

📝 REGISTRO DIÁRIO (/registro) — ADMIN
- Formulário para inserir manualmente status de cada rotina no dia
- Campos: rotina, status (Sucesso/Erro/Parcial), detalhes opcionais

📤 IMPORTAÇÃO (/importacao) — ADMIN
- Upload de planilha xlsx/xls/csv com histórico de execuções
- Formato: colunas data + nome_rotina + status + detalhes
- Histórico de uploads anteriores

📅 HISTÓRICO (/historico) — ADMIN
- Calendário heatmap: cada dia do mês com intensidade de erros
- Análise mensal: resumo agregado por mês
- Clique em um dia para ver detalhe das rotinas naquele dia

🚨 ALERTAS (/alertas) — ADMIN
- Lista de rotinas com 2+ erros consecutivos
- Lista de rotinas sem execução há 3+ dias
- Calculado em tempo real

═══════════════════════════════════════
DADOS DISPONÍVEIS NO SNAPSHOT
═══════════════════════════════════════
snapshot.glpiHoje — dados do GLPI de HOJE (sempre presente se GLPI configurado):
  .abertos: total de chamados abertos agora
  .envelhecidos: chamados abertos há mais de 45 dias
  .abertosHoje: quantos foram abertos hoje
  .solucionadosHoje: quantos foram solucionados hoje
  .abertosOntem: comparativo de ontem
  .solucionadosOntem: comparativo de ontem
  .slaSolucaoHoje: { percentual, total, dentroPrazo, foraPrazo, meta:'80%', status:'BOM'|'ALERTA'|'CRITICO' }
  .slaAtendimentoHoje: { percentual, total, foraPrazo, status }
  .porStatus: { novos, atribuidos, planejados, pendentes }
  .tempoMedioSolucaoHoje: horas médias para resolver hoje
  .chamadosEnvelhecidos: array[{ id, titulo, diasAberto, solicitante }] — lista dos envelhecidos

snapshot.rotinas — dados das rotinas automatizadas:
  .ultimaExecucaoCadaRotina: última execução de cada rotina { rotina_id, nome, status, data_execucao, detalhes }
  .historico30dias: dados diários dos últimos 30 dias { data, total, sucesso, erro, parcial, taxa_sucesso }
  .alertas.errosConsecutivos: rotinas com 2+ erros seguidos [{ rotina_id, nome, dias_erro }]
  .alertas.rotinasSemExecucao: rotinas não executadas há 3+ dias [{ rotina_id, nome, dias_sem_exec }]

snapshot.glpiUltimos7Dias: array[{ data, quantidade (abertos), envelhecidos }]

═══════════════════════════════════════
REGRAS DE RESPOSTA
═══════════════════════════════════════
- Responda SEMPRE em português brasileiro, máximo 4 parágrafos curtos e objetivos
- Use snapshot.glpiHoje como fonte primária para qualquer dado de hoje
- Para listar envelhecidos: use snapshot.glpiHoje.chamadosEnvelhecidos (id + título + dias + solicitante)
- SLA status: BOM = ≥80%, ALERTA = 60-79%, CRÍTICO = <60%
- Formate números: separador de milhar (ex: 1.234), percentuais com 1 decimal (ex: 87,5%)
- Se perguntarem sobre dados de páginas específicas além do snapshot (como SLA detalhado por prioridade, categorias com filtros, explorador), explique o que a página mostra e oriente o usuário a acessá-la para ver os dados em tempo real
- NUNCA diga que não tem dados de SLA ou envelhecidos — eles sempre estão no snapshot.glpiHoje
- Para comparar hoje com ontem: use abertosHoje vs abertosOntem e solucionadosHoje vs solucionadosOntem
- Se uma rotina aparece em errosConsecutivos, destaque como crítico
- Se há rotinas em rotinasSemExecucao, isso é um alerta de atenção`;

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
