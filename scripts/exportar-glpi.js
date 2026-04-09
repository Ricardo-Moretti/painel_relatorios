/**
 * exportar-glpi.js
 * Extrai todos os chamados do GLPI dos últimos 12 meses e gera um arquivo Excel
 * formatado com tabela, filtros, cabeçalho colorido e larguras automáticas.
 *
 * Uso (rodar da raiz do projeto):
 *   node scripts/exportar-glpi.js              → últimos 365 dias
 *   node scripts/exportar-glpi.js 180          → últimos 180 dias
 *   node scripts/exportar-glpi.js 2025-01-01   → a partir de 01/01/2025
 *
 * O arquivo gerado vai para exports/
 */

const path = require('path');
const BE   = path.join(__dirname, '../backend');

require(path.join(BE, 'node_modules/dotenv')).config({ path: path.join(BE, '.env') });
const mysql   = require(path.join(BE, 'node_modules/mysql2/promise'));
const ExcelJS = require(path.join(BE, 'node_modules/exceljs'));
const { getSecureEnv } = require(path.join(BE, 'src/config/crypto'));

// ── Parâmetro de data ────────────────────────────────────────────────────────
const arg = process.argv[2];
let whereData;
if (!arg) {
  whereData = `t.date >= DATE_SUB(NOW(), INTERVAL 365 DAY)`;
} else if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
  whereData = `t.date >= '${arg}'`;
} else if (/^\d+$/.test(arg)) {
  const dias = parseInt(arg, 10);
  whereData = `t.date >= DATE_SUB(NOW(), INTERVAL ${dias} DAY)`;
} else {
  console.error('Parâmetro inválido. Use um número de dias ou uma data YYYY-MM-DD.');
  process.exit(1);
}

// ── Config colunas ───────────────────────────────────────────────────────────
const COLUNAS = [
  { header: 'Nº Chamado',         key: 'id',              width: 13 },
  { header: 'Assunto / Título',   key: 'titulo',          width: 50 },
  { header: 'Tipo',               key: 'tipo',            width: 14 },
  { header: 'Status',             key: 'status',          width: 14 },
  { header: 'Urgência',           key: 'urgencia',        width: 14 },
  { header: 'Prioridade',         key: 'prioridade',      width: 14 },
  { header: 'Entidade',           key: 'entidade',        width: 30 },
  { header: 'Data Abertura',      key: 'data_abertura',   width: 18 },
  { header: 'Data Solução',       key: 'data_solucao',    width: 18 },
  { header: 'Data Fechamento',    key: 'data_fechamento', width: 18 },
  { header: 'Prazo SLA',          key: 'prazo_sla',       width: 18 },
  { header: 'SLA Cumprido',       key: 'sla_cumprido',    width: 14 },
  { header: 'Requerente',         key: 'requerente',      width: 28 },
  { header: 'Atendente',          key: 'atendente',       width: 28 },
  { header: 'Grupo Atendente',    key: 'grupo_atendente', width: 24 },
  { header: 'Categoria',          key: 'categoria',       width: 40 },
  { header: 'Tempo Solução (h)',  key: 'tempo_solucao',   width: 18 },
  { header: '1ª Resposta (h)',    key: 'tempo_resposta',  width: 16 },
  { header: 'Espera (h)',         key: 'tempo_espera',    width: 13 },
  { header: 'Idade (dias)',       key: 'idade_dias',      width: 13 },
];

// Cores por valor ──────────────────────────────────────────────────────────────
const COR_STATUS = {
  'Novo':        { bg: 'FFE2E8F0', fg: 'FF475569' },
  'Atribuído':   { bg: 'FFDCFCE7', fg: 'FF15803D' },
  'Planejado':   { bg: 'FFFEF9C3', fg: 'FF854D0E' },
  'Pendente':    { bg: 'FFFFEDD5', fg: 'FF9A3412' },
  'Solucionado': { bg: 'FFDBEAFE', fg: 'FF1D4ED8' },
  'Fechado':     { bg: 'FFF1F5F9', fg: 'FF64748B' },
};

const COR_PRIO = {
  'Muito baixa': { fg: 'FF94A3B8' },
  'Baixa':       { fg: 'FF16A34A' },
  'Média':       { fg: 'FFB45309' },
  'Alta':        { fg: 'FFEA580C' },
  'Muito alta':  { fg: 'FFDC2626' },
  'Crítica':     { fg: 'FF9333EA' },
};

const COR_SLA = {
  'Sim': { bg: 'FFF0FDF4', fg: 'FF16A34A' },
  'Não': { bg: 'FFFEF2F2', fg: 'FFDC2626' },
  'N/A': { bg: 'FFF8FAFC', fg: 'FF94A3B8' },
};

// ── Conexão MySQL ─────────────────────────────────────────────────────────────
const GRUPO_TI_ID = parseInt(process.env.GLPI_GRUPO_TI_ID) || 1;

async function buscarChamados() {
  const conn = await mysql.createConnection({
    host:     process.env.GLPI_MYSQL_HOST,
    port:     parseInt(process.env.GLPI_MYSQL_PORT) || 3306,
    user:     process.env.GLPI_MYSQL_USER,
    password: getSecureEnv('GLPI_MYSQL_PASSWORD'),
    database: process.env.GLPI_MYSQL_DATABASE,
    connectTimeout: 10000,
  });

  console.log(`[GLPI] Conectado em ${process.env.GLPI_MYSQL_HOST}/${process.env.GLPI_MYSQL_DATABASE}`);
  console.log(`[GLPI] Buscando chamados (grupo TI = ${GRUPO_TI_ID})...`);

  const GF = `INNER JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2 AND gt.groups_id = ${GRUPO_TI_ID}`;
  const EF = `AND t.entities_id NOT IN (SELECT id FROM glpi_entities WHERE UPPER(name) LIKE '%PARCEIRO%')`;

  const [rows] = await conn.execute(`
    SELECT DISTINCT
      t.id,
      t.name AS titulo,
      CASE t.type WHEN 1 THEN 'Incidente' WHEN 2 THEN 'Requisição' ELSE CONCAT('Tipo ',t.type) END AS tipo,
      CASE t.status
        WHEN 1 THEN 'Novo'        WHEN 2 THEN 'Atribuído'  WHEN 3 THEN 'Planejado'
        WHEN 4 THEN 'Pendente'    WHEN 5 THEN 'Solucionado' WHEN 6 THEN 'Fechado'
        ELSE CONCAT('Status ',t.status) END                                        AS status,
      CASE t.urgency
        WHEN 1 THEN 'Muito baixa' WHEN 2 THEN 'Baixa' WHEN 3 THEN 'Média'
        WHEN 4 THEN 'Alta'        WHEN 5 THEN 'Muito alta'
        ELSE CONCAT('Urg.',t.urgency) END                                          AS urgencia,
      CASE t.priority
        WHEN 1 THEN 'Muito baixa' WHEN 2 THEN 'Baixa'   WHEN 3 THEN 'Média'
        WHEN 4 THEN 'Alta'        WHEN 5 THEN 'Muito alta' WHEN 6 THEN 'Crítica'
        ELSE CONCAT('Prio.',t.priority) END                                        AS prioridade,
      COALESCE(ent.completename,'')                                                AS entidade,
      DATE_FORMAT(t.date,            '%d/%m/%Y %H:%i')                             AS data_abertura,
      DATE_FORMAT(t.solvedate,       '%d/%m/%Y %H:%i')                             AS data_solucao,
      DATE_FORMAT(t.closedate,       '%d/%m/%Y %H:%i')                             AS data_fechamento,
      DATE_FORMAT(t.time_to_resolve, '%d/%m/%Y %H:%i')                             AS prazo_sla,
      CASE
        WHEN t.time_to_resolve IS NULL OR t.status = 4                        THEN 'N/A'
        WHEN t.solvedate IS NOT NULL AND t.solvedate <= t.time_to_resolve      THEN 'Sim'
        WHEN t.solvedate IS NOT NULL AND t.solvedate >  t.time_to_resolve      THEN 'Não'
        WHEN t.solvedate IS NULL     AND t.time_to_resolve >= NOW()            THEN 'Sim'
        ELSE 'Não'
      END                                                                          AS sla_cumprido,
      TRIM(CONCAT(COALESCE(u_req.firstname,''),' ',COALESCE(u_req.realname,'')))   AS requerente,
      TRIM(CONCAT(COALESCE(u_tec.firstname,''),' ',COALESCE(u_tec.realname,'')))   AS atendente,
      COALESCE(g_tec.completename,'')                                              AS grupo_atendente,
      REPLACE(COALESCE(c.completename,'Sem categoria'),'TECNOLOGIA DA INFORMAÇÃO','TI') AS categoria,
      ROUND(t.solve_delay_stat           / 3600, 1) AS tempo_solucao,
      ROUND(t.takeintoaccount_delay_stat / 3600, 1) AS tempo_resposta,
      ROUND(t.waiting_duration           / 3600, 1) AS tempo_espera,
      DATEDIFF(COALESCE(t.solvedate, NOW()), t.date) AS idade_dias
    FROM glpi_tickets t ${GF}
    LEFT JOIN glpi_entities       ent    ON ent.id   = t.entities_id
    LEFT JOIN glpi_itilcategories c      ON c.id     = t.itilcategories_id
    LEFT JOIN glpi_tickets_users  tu_req ON tu_req.tickets_id = t.id AND tu_req.type = 1
    LEFT JOIN glpi_users          u_req  ON u_req.id = tu_req.users_id
    LEFT JOIN glpi_tickets_users  tu_tec ON tu_tec.tickets_id = t.id AND tu_tec.type = 2
    LEFT JOIN glpi_users          u_tec  ON u_tec.id = tu_tec.users_id
    LEFT JOIN glpi_groups_tickets gt_tec ON gt_tec.tickets_id = t.id AND gt_tec.type = 2
    LEFT JOIN glpi_groups         g_tec  ON g_tec.id = gt_tec.groups_id
    WHERE t.is_deleted = 0 ${EF}
      AND ${whereData}
    ORDER BY t.date DESC
  `);

  await conn.end();
  return rows;
}

// ── Gerar Excel ───────────────────────────────────────────────────────────────
async function gerarExcel(rows) {
  const wb = new ExcelJS.Workbook();
  wb.creator   = 'Painel de Rotinas';
  wb.created   = new Date();
  wb.modified  = new Date();

  const ws = wb.addWorksheet('Chamados GLPI', {
    views: [{ state: 'frozen', ySplit: 1 }],  // congela cabeçalho
  });

  // Colunas
  ws.columns = COLUNAS;

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF2563EB' } },
    };
  });

  // ── Linhas de dados ────────────────────────────────────────────────────────
  rows.forEach((r, idx) => {
    const row = ws.addRow([
      r.id, r.titulo, r.tipo, r.status, r.urgencia, r.prioridade,
      r.entidade, r.data_abertura, r.data_solucao, r.data_fechamento,
      r.prazo_sla, r.sla_cumprido,
      r.requerente || '-', r.atendente || 'Não atribuído', r.grupo_atendente || '-',
      r.categoria,
      r.tempo_solucao, r.tempo_resposta, r.tempo_espera, r.idade_dias,
    ]);

    row.height = 20;

    const isEven = idx % 2 === 1;
    const bgBase = isEven ? 'FFF0F4F8' : 'FFFFFFFF';

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      // Fundo alternado
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgBase } };
      cell.font = { size: 10, name: 'Calibri', color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    });

    // Nº chamado — azul negrito
    const cellId = row.getCell(1);
    cellId.font = { bold: true, color: { argb: 'FF1D4ED8' }, size: 10, name: 'Calibri' };
    cellId.alignment = { vertical: 'middle', horizontal: 'center' };

    // Status — badge colorido
    const cellStatus = row.getCell(4);
    const corStatus = COR_STATUS[r.status];
    if (corStatus) {
      cellStatus.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corStatus.bg } };
      cellStatus.font = { bold: true, color: { argb: corStatus.fg }, size: 10, name: 'Calibri' };
    }
    cellStatus.alignment = { vertical: 'middle', horizontal: 'center' };

    // Prioridade — cor por nível
    const cellPrio = row.getCell(6);
    const corPrio = COR_PRIO[r.prioridade];
    if (corPrio) {
      cellPrio.font = { bold: true, color: { argb: corPrio.fg }, size: 10, name: 'Calibri' };
    }
    cellPrio.alignment = { vertical: 'middle', horizontal: 'center' };

    // SLA Cumprido — verde/vermelho/cinza
    const cellSla = row.getCell(12);
    const corSla = COR_SLA[r.sla_cumprido];
    if (corSla) {
      cellSla.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corSla.bg } };
      cellSla.font = { bold: true, color: { argb: corSla.fg }, size: 10, name: 'Calibri' };
    }
    cellSla.alignment = { vertical: 'middle', horizontal: 'center' };

    // Tipo e Urgência — centralizados
    row.getCell(3).alignment  = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment  = { vertical: 'middle', horizontal: 'center' };
    row.getCell(17).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(18).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(19).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(20).alignment = { vertical: 'middle', horizontal: 'right' };
  });

  // ── Auto-filtro na tabela inteira ──────────────────────────────────────────
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: COLUNAS.length },
  };

  // ── Aba de Resumo ──────────────────────────────────────────────────────────
  const wsRes = wb.addWorksheet('Resumo', {
    views: [{ state: 'normal' }],
  });
  wsRes.columns = [
    { key: 'label', width: 28 },
    { key: 'valor', width: 20 },
  ];

  const totalChamados = rows.length;
  const solucionados  = rows.filter(r => r.status === 'Solucionado' || r.status === 'Fechado').length;
  const abertos       = rows.filter(r => !['Solucionado','Fechado'].includes(r.status)).length;
  const foraSlaCnt    = rows.filter(r => r.sla_cumprido === 'Não').length;
  const simSlaCnt     = rows.filter(r => r.sla_cumprido === 'Sim').length;
  const slaPct        = (simSlaCnt + foraSlaCnt) > 0
    ? ((simSlaCnt / (simSlaCnt + foraSlaCnt)) * 100).toFixed(1) + '%'
    : 'N/A';
  const temposMedSol  = rows.filter(r => r.tempo_solucao > 0).map(r => r.tempo_solucao);
  const mediaSol      = temposMedSol.length
    ? (temposMedSol.reduce((a,b) => a + b, 0) / temposMedSol.length).toFixed(1) + 'h'
    : 'N/A';
  const dataGeracao   = new Date().toLocaleString('pt-BR');

  const resumoItems = [
    ['', ''],
    ['  RESUMO DO RELATÓRIO GLPI', ''],
    ['', ''],
    ['  Data de Geração',       dataGeracao],
    ['  Período',               arg ? (arg.length > 4 ? `A partir de ${arg}` : `Últimos ${arg} dias`) : 'Últimos 12 meses'],
    ['', ''],
    ['  Total de Chamados',     totalChamados],
    ['  Chamados Abertos',      abertos],
    ['  Solucionados/Fechados', solucionados],
    ['', ''],
    ['  SLA Cumprido',          slaPct],
    ['  Fora do SLA',           foraSlaCnt],
    ['  Tempo Médio Solução',   mediaSol],
  ];

  resumoItems.forEach(([label, valor], i) => {
    const row = wsRes.addRow({ label, valor });
    row.height = i === 1 ? 32 : 22;

    if (i === 1) {
      // Título do resumo
      const c = row.getCell(1);
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      c.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
      c.alignment = { vertical: 'middle' };
      wsRes.mergeCells(i + 1, 1, i + 1, 2);
    } else if (label && label.trim()) {
      row.getCell(1).font = { size: 11, color: { argb: 'FF334155' }, name: 'Calibri' };
      row.getCell(2).font = { bold: true, size: 11, color: { argb: 'FF1D4ED8' }, name: 'Calibri' };
      row.getCell(2).alignment = { horizontal: 'right' };
    }
  });

  wsRes.getColumn(1).width = 32;
  wsRes.getColumn(2).width = 22;

  // ── Salvar ─────────────────────────────────────────────────────────────────
  const dataStr = new Date().toISOString().slice(0, 10);
  const outFile = path.resolve(__dirname, `../exports/chamados-glpi-${dataStr}.xlsx`);
  await wb.xlsx.writeFile(outFile);
  return outFile;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const rows    = await buscarChamados();
  console.log(`[GLPI] ${rows.length} chamados encontrados. Gerando Excel...`);
  const outFile = await gerarExcel(rows);
  console.log(`[GLPI] Arquivo gerado: ${outFile}`);
}

main().catch(err => {
  console.error('[ERRO]', err.message);
  process.exit(1);
});
