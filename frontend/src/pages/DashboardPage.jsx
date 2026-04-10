/**
 * Dashboard TV — Otimizado para exibição em televisão
 * Letras grandes, números em destaque, mínimo scroll
 */
import { useState, useEffect, useRef } from 'react'
import { Download, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { toPng } from 'html-to-image'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Header from '../components/layout/Header'
import HistoricoDetalhe from '../components/dashboard/HistoricoDetalhe'
import { dashboardAPI, glpiAPI } from '../services/api'
import useToastStore from '../stores/toastStore'
import useCountUp from '../hooks/useCountUp'
import ExportButton from '../components/ui/ExportButton'
import useNotifications from '../hooks/useNotifications'

/* ===== KPI Card — premium style with gradient top bar ===== */
const GRADIENT_MAP = {
  'var(--blue)': 'var(--gradient-blue)',
  'var(--green)': 'var(--gradient-green)',
  'var(--red)': 'var(--gradient-red)',
  'var(--amber)': 'var(--gradient-amber)',
}

function KpiCard({ label, valor, cor, variacao }) {
  const animatedValue = useCountUp(valor, 800)
  const gradient = GRADIENT_MAP[cor] || `linear-gradient(135deg, ${cor} 0%, ${cor} 100%)`
  return (
    <div style={{
      backgroundColor: 'var(--bg-card)', borderRadius: '12px',
      padding: '0',
      border: '1px solid var(--border-glow)',
      boxShadow: 'var(--shadow-sm)', transition: 'all 200ms',
      overflow: 'hidden', position: 'relative',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>
      {/* Gradient accent bar at top */}
      <div style={{ height: '3px', background: gradient, width: '100%' }} />
      <div style={{ padding: '6px 12px 8px' }}>
        <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
          <p style={{ fontSize: '26px', fontWeight: 800, color: cor, lineHeight: 1, letterSpacing: '-0.02em' }}>{animatedValue}</p>
          {variacao !== undefined && variacao !== 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '2px',
              fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '8px',
              backgroundColor: variacao > 0 ? 'var(--green-subtle)' : 'var(--red-subtle)',
              border: `1px solid ${variacao > 0 ? 'var(--green-border)' : 'var(--red-border)'}`,
              color: variacao > 0 ? 'var(--green)' : 'var(--red)',
              flexShrink: 0,
            }}>
              {variacao > 0 ? <ArrowUpRight style={{ width: '12px', height: '12px' }} /> : <ArrowDownRight style={{ width: '12px', height: '12px' }} />}
              {Math.abs(variacao)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ===== Tabela Rotinas — compacta, legível de longe, zebra rows ===== */
function TabelaRotinas({ dados = [], onClickRotina }) {
  const corDot = (s) => s === 'Sucesso' ? 'var(--green)' : s === 'Erro' ? 'var(--red)' : s === 'Parcial' ? 'var(--amber)' : 'var(--text-muted)'
  const statusIcon = (s) => s === 'Sucesso' ? '\u2713' : s === 'Erro' ? '\u2717' : s === 'Parcial' ? '\u25CE' : '\u2014'
  return (
    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-sm), var(--glow-card)', borderRadius: '16px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--bg-inset)' }}>
            {['#', 'Rotina', 'Freq.', 'Status', 'Ultima Exec.', 'Detalhes'].map(c => (
              <th key={c} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', ...(c === '#' ? { width: '50px', textAlign: 'center' } : {}) }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((r, i) => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background 150ms', backgroundColor: i % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.025)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = i % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent'}
              onClick={() => onClickRotina?.(r)}>
              <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>{i + 1}</td>
              <td style={{ padding: '10px 16px', fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>{r.nome}</td>
              <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{r.frequencia}</td>
              <td style={{ padding: '10px 16px' }}>
                {r.glpiQuantidade != null ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: '44px', padding: '5px 14px', borderRadius: '10px',
                    fontSize: '15px', fontWeight: 800,
                    backgroundColor: r.glpiQuantidade <= 50 ? 'rgba(22,163,74,0.12)' : r.glpiQuantidade <= 60 ? 'rgba(245,158,11,0.12)' : 'rgba(252,56,29,0.12)',
                    border: `1.5px solid ${r.glpiQuantidade <= 50 ? 'rgba(22,163,74,0.3)' : r.glpiQuantidade <= 60 ? 'rgba(245,158,11,0.3)' : 'rgba(252,56,29,0.3)'}`,
                    color: r.glpiQuantidade <= 50 ? '#16a34a' : r.glpiQuantidade <= 60 ? '#f59e0b' : '#fc381d',
                  }}>{r.glpiQuantidade}</span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, backgroundColor: corDot(r.statusAtual) === 'var(--green)' ? 'var(--green-subtle)' : corDot(r.statusAtual) === 'var(--red)' ? 'var(--red-subtle)' : 'var(--amber-subtle)', border: `1.5px solid ${corDot(r.statusAtual) === 'var(--green)' ? 'var(--green-border)' : corDot(r.statusAtual) === 'var(--red)' ? 'var(--red-border)' : 'var(--amber-border)'}`, color: corDot(r.statusAtual) }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1 }}>{statusIcon(r.statusAtual)}</span>
                    {r.statusAtual || 'Sem dados'}
                  </span>
                )}
              </td>
              <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{(() => { const v = r.ultimaAtualizacao || r.ultimaExecucao; return v && v.length >= 10 ? v.substring(8,10)+'/'+v.substring(5,7) : '-' })()}</td>
              <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.detalhes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ===== Resumo Multi-Período com filtros ===== */
function ResumoMulti({ dados: dadosIniciais, rotinas = [] }) {
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroRotina, setFiltroRotina] = useState('todas')
  const [dados, setDados] = useState(dadosIniciais)

  useEffect(() => { setDados(dadosIniciais) }, [dadosIniciais])

  useEffect(() => {
    if (filtroRotina === 'todas') { setDados(dadosIniciais); return }
    dashboardAPI.obterResumoMultiPeriodo(filtroRotina)
      .then(({ data }) => setDados(data.dados))
      .catch(() => {})
  }, [filtroRotina])

  if (!dados) return null

  const periodos = [
    { key: '10d', label: '10 dias' },
    { key: '30d', label: '30 dias' },
    { key: '90d', label: '90 dias' },
    { key: 'mesAtual', label: 'Mes atual' },
  ]

  const btnFiltro = (ativo) => ({
    padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'all 150ms',
    backgroundColor: ativo ? '#017efa' : 'transparent',
    color: ativo ? '#ffffff' : 'var(--text-muted)',
  })

  const selectStyle = {
    padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
    border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)',
    color: 'var(--text-heading)', cursor: 'pointer', outline: 'none',
  }

  // Colunas visiveis baseado no filtro de status
  const colunas = []
  colunas.push({ key: 'total', label: 'Total', cor: 'var(--text-muted)' })
  if (filtroStatus === 'todos' || filtroStatus === 'sucesso') colunas.push({ key: 'sucesso', label: 'Sucesso', cor: 'var(--green)' })
  if (filtroStatus === 'todos' || filtroStatus === 'erro') colunas.push({ key: 'erro', label: 'Erro', cor: 'var(--red)' })
  if (filtroStatus === 'todos' || filtroStatus === 'parcial') colunas.push({ key: 'parcial', label: 'Parcial', cor: 'var(--amber)' })
  colunas.push({ key: 'taxa', label: 'Taxa', cor: 'var(--text-muted)' })

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-sm), var(--glow-card)', borderRadius: '14px', overflow: 'hidden' }}>
      {/* Header com filtros */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Analise por Periodo</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Filtro por status */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-inset)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-light)' }}>
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'sucesso', label: 'Sucesso' },
              { key: 'erro', label: 'Erros' },
              { key: 'parcial', label: 'Parcial' },
            ].map(f => (
              <button key={f.key} onClick={() => setFiltroStatus(f.key)} style={btnFiltro(filtroStatus === f.key)}>{f.label}</button>
            ))}
          </div>

          {/* Filtro por rotina */}
          {rotinas.length > 0 && (
            <select value={filtroRotina} onChange={(e) => setFiltroRotina(e.target.value)} style={selectStyle}>
              <option value="todas">Todas rotinas</option>
              {rotinas.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-inset)' }}>
            <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Periodo</th>
            {colunas.map(c => (
              <th key={c.key} style={{ textAlign: 'center', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: c.cor, textTransform: 'uppercase' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periodos.map(({ key, label }, i) => {
            const d = dados[key] || {}
            const taxaCor = d.taxa >= 80 ? 'var(--green)' : d.taxa >= 50 ? 'var(--amber)' : 'var(--red)'
            return (
              <tr key={key} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: i % 2 === 1 ? 'var(--bg-inset)' : 'transparent' }}>
                <td style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>{label}</td>
                {colunas.map(c => (
                  <td key={c.key} style={{ padding: '8px 14px', fontSize: '16px', fontWeight: 800, textAlign: 'center', color: c.key === 'taxa' ? taxaCor : c.key === 'total' ? 'var(--text-heading)' : c.cor }}>
                    {c.key === 'taxa' ? `${d.taxa || 0}%` : d[c.key] || 0}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ===== Status 10 dias + GLPI — visual melhorado ===== */
function GlpiHeatmap({ heatmap = [], glpi = [], todasRotinas = [] }) {
  const diasArray = []
  for (let i = 9; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); diasArray.push(d.toISOString().split('T')[0]) }
  const porRotina = {}
  heatmap.forEach(({ rotina, data, status }) => { if (!porRotina[rotina]) porRotina[rotina] = {}; porRotina[rotina][data] = status })
  // Incluir todas as rotinas, mesmo sem dados
  todasRotinas.forEach(r => { if (!porRotina[r]) porRotina[r] = {} })
  const rotinas = Object.keys(porRotina).sort()
  const glpiMap = {}; glpi.forEach(g => { glpiMap[g.data] = { quantidade: g.quantidade, envelhecidos: g.envelhecidos || 0 } })
  const somaGlpi = glpi.reduce((a, d) => a + d.quantidade, 0)
  const ultimoGlpi = glpi.length ? glpi[glpi.length - 1] : null
  const somaEnvelhecidos = ultimoGlpi?.envelhecidos || 0
  const mediaGlpi = glpi.length ? Math.round(somaGlpi / glpi.length) : 0

  // Cor da bolinha: para GLPI usa o número, para outras usa o status texto
  const corC = (s) => s === 'Sucesso' ? '#16a34a' : s === 'Erro' ? '#fc381d' : s === 'Parcial' ? '#f59e0b' : '#e2e8f0'
  const corGlpiBolinha = (q) => q == null ? '#e2e8f0' : q <= 50 ? '#16a34a' : q <= 60 ? '#f59e0b' : '#fc381d'
  const corB = (q) => q == null ? null : q <= 50 ? '#16a34a' : q <= 60 ? '#f59e0b' : '#fc381d'
  const corBg = (q) => q == null ? null : q <= 50 ? 'rgba(22,163,74,0.12)' : q <= 60 ? 'rgba(245,158,11,0.12)' : 'rgba(252,56,29,0.12)'
  const corBd = (q) => q == null ? null : q <= 50 ? 'rgba(22,163,74,0.3)' : q <= 60 ? 'rgba(245,158,11,0.3)' : 'rgba(252,56,29,0.3)'

  const isGlpi = (rot) => rot.toUpperCase() === 'GLPI'
  const glpiQtd = (d) => glpiMap[d]?.quantidade ?? null
  const glpiEnv = (d) => glpiMap[d]?.envelhecidos ?? 0

  // Contagem por rotina — GLPI conta baseado no número
  const contagemRotina = (rot) => {
    let s = 0, e = 0, p = 0
    diasArray.forEach(d => {
      if (isGlpi(rot)) {
        const q = glpiQtd(d)
        if (q != null) { if (q <= 50) s++; else if (q <= 60) p++; else e++ }
      } else {
        const st = porRotina[rot]?.[d]
        if (st === 'Sucesso') s++; else if (st === 'Erro') e++; else if (st === 'Parcial') p++
      }
    })
    return { s, e, p }
  }

  const glowBolinha = (s, q) => {
    if (s === 'Erro' || q > 60) return '0 0 10px 2px rgba(252,56,29,0.65)'
    if (s === 'Sucesso' || (q != null && q <= 50)) return '0 0 8px 1px rgba(22,163,74,0.5)'
    if (s === 'Parcial' || (q != null && q <= 60)) return '0 0 8px 1px rgba(245,158,11,0.5)'
    return 'none'
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-glow)', boxShadow: '0 4px 32px rgba(1,126,250,0.08), var(--glow-card)', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Header com resumo */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'linear-gradient(90deg, var(--bg-inset) 0%, var(--bg-card) 100%)' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>Status dos Ultimos 10 Dias</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Acompanhamento diario das rotinas + chamados GLPI</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* KPIs mini do GLPI */}
          <div style={{ textAlign: 'center', padding: '8px 20px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <p style={{ fontSize: '22px', fontWeight: 800, color: mediaGlpi > 60 ? '#fc381d' : mediaGlpi > 50 ? '#f59e0b' : '#30d987', lineHeight: 1 }}>{mediaGlpi}</p>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px' }}>Media abertos/dia</p>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 20px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <p style={{ fontSize: '22px', fontWeight: 800, color: somaEnvelhecidos > 0 ? '#fc381d' : '#30d987', lineHeight: 1 }}>{somaEnvelhecidos}</p>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px' }}>Envelhecidos (+45d)</p>
          </div>
          {/* Legenda */}
          <div style={{ display: 'flex', gap: '16px' }}>
            {[{ l: 'Sucesso', c: '#16a34a' }, { l: 'Erro', c: '#fc381d' }, { l: 'Parcial', c: '#f59e0b' }, { l: 'Sem dados', c: '#cbd5e1' }].map(({ l, c }) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: c, boxShadow: `0 0 6px ${c}88` }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-inset)' }}>
            <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '160px' }}>Rotina</th>
            {diasArray.map(d => (
              <th key={d} style={{ textAlign: 'center', padding: '10px 6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                {d && d.length >= 10 ? d.substring(8,10)+'/'+d.substring(5,7) : d}
              </th>
            ))}
            <th style={{ textAlign: 'center', padding: '10px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '110px' }}>Resumo</th>
          </tr>
        </thead>
        <tbody>
          {rotinas.map((rot, i) => {
            const c = contagemRotina(rot)
            return (
              <tr key={rot} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: i % 2 === 1 ? 'var(--bg-inset)' : 'transparent', transition: 'background 100ms' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = i % 2 === 1 ? 'var(--bg-inset)' : 'transparent'}>
                <td style={{ padding: '10px 20px', fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>{rot}</td>
                {diasArray.map(d => {
                  const status = porRotina[rot]?.[d]
                  const q = glpiQtd(d)
                  const corBolinha = isGlpi(rot) ? corGlpiBolinha(q) : corC(status)
                  const dFmt = d && d.length >= 10 ? d.substring(8,10)+'/'+d.substring(5,7)+'/'+d.substring(0,4) : d
                  const tooltipText = isGlpi(rot)
                    ? `GLPI — ${dFmt} — ${q != null ? q + ' abertos, ' + glpiEnv(d) + ' envelhecidos' : 'Sem dados'}`
                    : `${rot} — ${dFmt} — ${status || 'Sem dados'}`
                  return (
                    <td key={d} style={{ textAlign: 'center', padding: '10px 6px' }}>
                      <span title={tooltipText}
                        style={{
                          display: 'inline-block', width: '26px', height: '26px', borderRadius: '50%',
                          backgroundColor: corBolinha,
                          boxShadow: glowBolinha(status, isGlpi(rot) ? glpiMap[d] : null),
                          transition: 'transform 150ms, box-shadow 150ms', cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.4)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }} />
                    </td>
                  )
                })}
                {/* Resumo mini */}
                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    {c.s > 0 && <span style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>{c.s}S</span>}
                    {c.e > 0 && <span style={{ fontSize: '13px', fontWeight: 800, color: '#fc381d' }}>{c.e}E</span>}
                    {c.p > 0 && <span style={{ fontSize: '13px', fontWeight: 800, color: '#f59e0b' }}>{c.p}P</span>}
                  </div>
                </td>
              </tr>
            )
          })}

          {/* Linha GLPI */}
          <tr style={{ borderTop: '2px solid var(--border)' }}>
            <td style={{ padding: '12px 20px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-heading)' }}>GLPI</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>abertos (envelhecidos)</span>
            </td>
            {diasArray.map(d => {
              const q = glpiQtd(d)
              const env = glpiEnv(d)
              return (
                <td key={d} style={{ textAlign: 'center', padding: '8px 6px' }}>
                  {q != null ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: '44px', padding: '4px 8px', borderRadius: '8px',
                        fontSize: '15px', fontWeight: 800,
                        backgroundColor: corBg(q), border: `1.5px solid ${corBd(q)}`, color: corB(q),
                        boxShadow: q > 60 ? '0 0 10px 2px rgba(252,56,29,0.4)' : q > 50 ? '0 0 8px rgba(245,158,11,0.3)' : '0 0 8px rgba(22,163,74,0.25)',
                      }}>{q}</span>
                      {env > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#fc381d' }}>+{env}d</span>
                      )}
                    </div>
                  ) : <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>-</span>}
                </td>
              )
            })}
            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-heading)' }}>{mediaGlpi}</span>
                {somaEnvelhecidos > 0 && <span style={{ fontSize: '11px', fontWeight: 700, color: '#fc381d' }}>+{somaEnvelhecidos}d</span>}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/* ===== Dias sem Falha ===== */
function DiasSemFalha({ dados = [] }) {
  const cor = (d) => d >= 7 ? 'var(--green)' : d >= 3 ? 'var(--amber)' : 'var(--red)'
  const bg = (d) => d >= 7 ? 'var(--green-subtle)' : d >= 3 ? 'var(--amber-subtle)' : 'var(--red-subtle)'
  const bd = (d) => d >= 7 ? 'var(--green-border)' : d >= 3 ? 'var(--amber-border)' : 'var(--red-border)'
  return (
    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-sm), var(--glow-card)', borderRadius: '12px', padding: '16px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '20px' }}>Dias sem Falha</h3>
      <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        <div style={{ display: 'flex', gap: '12px', minWidth: 'max-content' }}>
          {dados.map(r => (
            <div key={r.id} style={{ textAlign: 'center', padding: '14px 18px', borderRadius: '12px', backgroundColor: bg(r.dias_sem_erro), border: `1px solid ${bd(r.dias_sem_erro)}`, minWidth: '100px', flexShrink: 0 }}>
              <p style={{ fontSize: '32px', fontWeight: 800, color: cor(r.dias_sem_erro), lineHeight: 1 }}>{r.dias_sem_erro}</p>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '6px', whiteSpace: 'nowrap' }}>{r.nome}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ===== SLA — estilo Top Channels (progress bars horizontais) ===== */
function SlaCompacto({ dados = [] }) {
  const cor = (d) => d >= 90 ? '#30d987' : d >= 70 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-sm), var(--glow-card)', borderRadius: '12px', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>SLA / Disponibilidade</h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Rotina</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '60px' }}>Taxa</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {dados.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-heading)', width: '130px', flexShrink: 0 }}>{r.nome}</span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: cor(r.disponibilidade), width: '55px', flexShrink: 0 }}>{r.disponibilidade}%</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '50px', flexShrink: 0 }}>{r.sucesso}/{r.total}</span>
            <div style={{ flex: 1, height: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-inset)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '6px', width: `${r.disponibilidade}%`, backgroundColor: cor(r.disponibilidade), transition: 'width 600ms ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===== Donut de Distribuição (estilo Demographic) ===== */
function DonutDistribuicao({ dados }) {
  if (!dados) return null
  const { totalSucesso = 0, totalErro = 0, totalParcial = 0, totalRotinas = 0 } = dados
  const items = [
    { label: 'Sucesso', valor: totalSucesso, cor: '#017efa', pct: totalRotinas ? ((totalSucesso / totalRotinas) * 100).toFixed(1) : 0 },
    { label: 'Erro', valor: totalErro, cor: '#fd1f9b', pct: totalRotinas ? ((totalErro / totalRotinas) * 100).toFixed(1) : 0 },
    { label: 'Parcial', valor: totalParcial, cor: '#30d987', pct: totalRotinas ? ((totalParcial / totalRotinas) * 100).toFixed(1) : 0 },
  ]

  // SVG donut manual
  const total = totalSucesso + totalErro + totalParcial
  let offset = 0
  const segments = items.map(item => {
    const pct = total > 0 ? (item.valor / total) * 100 : 0
    const dashArray = `${pct * 2.51327} ${251.327 - pct * 2.51327}`
    const dashOffset = -offset * 2.51327
    offset += pct
    return { ...item, dashArray, dashOffset }
  })

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-sm), var(--glow-card)', borderRadius: '12px', padding: '16px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '20px' }}>Distribuicao de Status</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {/* Donut SVG */}
        <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
          <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
            {segments.map((s, i) => (
              <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={s.cor} strokeWidth="12"
                strokeDasharray={s.dashArray} strokeDashoffset={s.dashOffset} strokeLinecap="round" />
            ))}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-heading)' }}>{total}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total</span>
          </div>
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          {items.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.cor, flexShrink: 0 }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-body)', flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-heading)' }}>{item.valor}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>{item.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ==================== PÁGINA PRINCIPAL ==================== */
export default function DashboardPage() {
  const [dados, setDados] = useState(null)
  const [avancados, setAvancados] = useState(null)
  const [comparacao, setComparacao] = useState(null)
  const [resumoMulti, setResumoMulti] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [dias, setDias] = useState(30)
  const [modalRotina, setModalRotina] = useState(null)
  const [ultimoRefresh, setUltimoRefresh] = useState(null)
  const dashRef = useRef(null)
  const addToast = useToastStore(s => s.addToast)

  // Push notifications para rotinas com erro
  useNotifications(dados?.tabelaAnalitica || [])

  useEffect(() => { carregarDados() }, [dias])

  // Auto-refresh a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => { carregarDados() }, 300000)
    return () => clearInterval(interval)
  }, [dias])

  const carregarDados = async () => {
    setCarregando(true)
    try {
      // Coleta GLPI atualizado antes de carregar o dashboard
      try { await glpiAPI.coletar() } catch (e) { /* silencioso se GLPI não configurado */ }

      const [base, avanc, comp, multi] = await Promise.all([
        dashboardAPI.obterDados({ dias }),
        dashboardAPI.obterDadosAvancados(dias),
        dashboardAPI.obterComparacao(dias),
        dashboardAPI.obterResumoMultiPeriodo(),
      ])
      setDados(base.data.dados)
      setAvancados(avanc.data.dados)
      setComparacao(comp.data.dados)
      setResumoMulti(multi.data.dados)
      if (base.data.dados?.cards?.totalErro > 0) addToast(`${base.data.dados.cards.totalErro} erro(s) no periodo`, 'warning')
      setUltimoRefresh(new Date())
    } catch (e) { console.error(e); addToast('Erro ao carregar', 'error') }
    finally { setCarregando(false) }
  }

  const exportarPNG = async () => {
    if (!dashRef.current) return
    try {
      const url = await toPng(dashRef.current, { quality: 0.95, backgroundColor: '#f1f5f9', pixelRatio: 2 })
      const a = document.createElement('a'); a.download = `dashboard-${new Date().toISOString().split('T')[0]}.png`; a.href = url; a.click()
      addToast('PNG exportado!', 'success')
    } catch (e) { console.error(e) }
  }

  if (carregando) {
    return (
      <>
        <Header titulo="Dashboard" subtitulo="Carregando..." />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--blue)' }} />
        </main>
      </>
    )
  }

  const { cards, tabelaAnalitica, heatmap10, glpi10dias } = dados || {}
  const v = comparacao?.variacao || {}

  return (
    <>
      <Header titulo="Painel de Rotinas" subtitulo={`Ultimos ${dias} dias — ${new Date().toLocaleDateString('pt-BR')}`} />

      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-page)' }}>
        <div ref={dashRef} className="page-content" style={{ maxWidth: '1920px', margin: '0 auto', padding: '8px 14px' }}>

          {/* ── Toolbar minimalista ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            {/* Seletor de período */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', borderRadius: '8px', padding: '3px', boxShadow: 'var(--shadow-xs)' }}>
              <Calendar style={{ width: '13px', height: '13px', margin: '0 6px', color: 'var(--text-muted)', flexShrink: 0 }} />
              {[7, 15, 30, 60, 90].map(d => (
                <button key={d} onClick={() => setDias(d)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 130ms', backgroundColor: dias === d ? '#017efa' : 'transparent', color: dias === d ? '#fff' : 'var(--text-muted)' }}>{d}d</button>
              ))}
            </div>

            {/* Ações direita */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {ultimoRefresh && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '999px', backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-light)', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }} />
                  {ultimoRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button onClick={exportarPNG} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 500, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-xs)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <Download style={{ width: '12px', height: '12px' }} /> PNG
              </button>
              <ExportButton />
            </div>
          </div>

          {/* ── ACIMA DO FOLD — KPIs + Heatmap são o foco na TV ── */}

          {/* KPI Cards — linha única super compacta */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '8px' }}>
            <KpiCard label="Total Execucoes" valor={cards?.totalRotinas || 0} cor="var(--blue)" />
            <KpiCard label="Sucessos" valor={cards?.totalSucesso || 0} cor="var(--green)" variacao={v.sucesso} />
            <KpiCard label="Parciais" valor={cards?.totalParcial || 0} cor="var(--amber)" />
            <KpiCard label="Erros" valor={cards?.totalErro || 0} cor="var(--red)" variacao={v.erro} />
          </div>

          {/* Heatmap — DESTAQUE TOTAL, logo após os KPIs */}
          <div style={{ marginBottom: '12px' }}>
            <GlpiHeatmap heatmap={heatmap10} glpi={glpi10dias} todasRotinas={(tabelaAnalitica || []).map(r => r.nome)} />
          </div>

          {/* ── ABAIXO DO FOLD — resto com scroll ── */}

          {/* Tabela de rotinas */}
          <div style={{ marginBottom: '8px' }}>
            <TabelaRotinas dados={tabelaAnalitica} onClickRotina={(r) => setModalRotina(r)} />
          </div>

          {/* ── ABAIXO DO FOLD — scroll para ver ── */}

          {/* Linha 1: Análise por período (grande) + Donut (1/3) */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <ResumoMulti dados={resumoMulti} rotinas={(tabelaAnalitica || []).map(r => r.nome)} />
            <DonutDistribuicao dados={cards} />
          </div>

          {/* Linha 2: Dias sem Falha (full width) */}
          <div style={{ marginBottom: '8px' }}>
            <DiasSemFalha dados={avancados?.streaks || []} />
          </div>

          {/* Linha 3: SLA (1/3) + Evolução Diária (2/3) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>

            <SlaCompacto dados={avancados?.sla || []} />

            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-sm)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)' }}>Evolucao Diaria</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ l: 'Sucesso', c: '#3794fc' }, { l: 'Erro', c: '#fc381d' }, { l: 'Parcial', c: '#dee5ef' }].map(({ l, c }) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '2px', backgroundColor: c }} />
                      <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted)' }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={avancados?.evolucaoDiaria || []} margin={{ top: 0, right: 4, left: -20, bottom: 0 }} barCategoryGap="35%">
                    <CartesianGrid vertical={false} stroke="#e5e9f2" />
                    <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickMargin={6}
                      tickFormatter={(val) => val && val.length >= 10 ? val.substring(8,10)+'/'+val.substring(5,7) : ''} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-md)', fontSize: '11px' }} />
                    <Bar dataKey="sucesso" name="Sucesso" stackId="a" fill="#3794fc" radius={[0,0,0,0]} barSize={14} />
                    <Bar dataKey="erro" name="Erro" stackId="a" fill="#fc381d" radius={[0,0,0,0]} barSize={14} />
                    <Bar dataKey="parcial" name="Parcial" stackId="a" fill="#dee5ef" radius={[3,3,0,0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      </main>

      {modalRotina && (
        <HistoricoDetalhe rotinaId={modalRotina.id} rotinaNome={modalRotina.nome} aberto={!!modalRotina} onFechar={() => setModalRotina(null)} />
      )}
    </>
  )
}
