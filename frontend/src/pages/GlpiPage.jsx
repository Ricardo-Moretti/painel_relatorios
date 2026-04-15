/**
 * GLPI BI — SLA completo, métricas de atendimento
 * Dados direto do MySQL do GLPI (somente leitura)
 */
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ReferenceLine } from 'recharts'
import { Monitor, Clock, CheckCircle2, Users, AlertTriangle, TrendingUp, Calendar, Mail } from 'lucide-react'
import Header from '../components/layout/Header'
import ExportButton from '../components/ui/ExportButton'
import { glpiAPI } from '../services/api'
import GlpiAiPanel from '../components/ai/GlpiAiPanel'
import useToastStore from '../stores/toastStore'

const CORES = ['#3794fc', '#fc381d', '#f59e0b', '#30d987', '#a037fc', '#51cbff', '#fd1f9b', '#6342ff']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ borderRadius: '10px', padding: '10px 14px', fontSize: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-lg)' }}>
      <p style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '4px' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1px 0' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}: <strong style={{ color: 'var(--text-heading)' }}>{p.value}</strong></span>
        </div>
      ))}
    </div>
  )
}

export default function GlpiPage() {
  const [dados, setDados] = useState(null)
  const [dias, setDias] = useState(30)
  const [carregando, setCarregando] = useState(true)
  const [comparacao, setComparacao] = useState(null)
  const [metCat, setMetCat] = useState(null)
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const addToast = useToastStore(s => s.addToast)

  useEffect(() => { carregar() }, [dias])

  const enviarEmail = async () => {
    if (enviandoEmail) return
    setEnviandoEmail(true)
    try {
      await glpiAPI.enviarRelatorio()
      addToast('Relatório enviado com sucesso!', 'success')
    } catch (e) {
      addToast('Erro ao enviar relatório. Verifique o n8n.', 'error')
    } finally {
      setEnviandoEmail(false)
    }
  }

  const carregar = async () => {
    setCarregando(true)
    try {
      const [biRes, compRes, catRes] = await Promise.all([
        glpiAPI.obterBI(dias),
        glpiAPI.compararMeses().catch(() => null),
        glpiAPI.metricasCategorias(dias).catch(() => null),
      ])
      setDados(biRes.data.dados)
      if (catRes?.data?.dados) setMetCat(catRes.data.dados)
      if (compRes?.data?.dados) setComparacao(compRes.data.dados)
    } catch (e) { console.error(e) }
    finally { setCarregando(false) }
  }

  if (carregando) {
    return (
      <>
        <Header titulo="GLPI — Business Intelligence" subtitulo="Carregando..." />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--blue)' }} />
        </main>
      </>
    )
  }

  const r = dados?.resumo || {}

  const GRADIENT_MAP_GLPI = {
    '#fc381d': 'var(--gradient-red)',
    '#30d987': 'var(--gradient-green)',
    '#3794fc': 'var(--gradient-blue)',
    '#a037fc': 'linear-gradient(135deg, #a037fc 0%, #6342ff 100%)',
    '#f59e0b': 'var(--gradient-amber)',
    '#6342ff': 'var(--gradient-blue)',
  }

  const card = (icon, label, valor, cor, sub) => (
    <div style={{
      backgroundColor: 'var(--bg-card)', borderRadius: '16px',
      padding: '0',
      border: '1px solid var(--border-glow)',
      boxShadow: 'var(--shadow-sm)', transition: 'all 250ms',
      overflow: 'hidden', position: 'relative',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>
      {/* Gradient accent bar at top */}
      <div style={{ height: '3px', background: GRADIENT_MAP_GLPI[cor] || `linear-gradient(135deg, ${cor} 0%, ${cor} 100%)`, width: '100%' }} />
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          {icon}
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        </div>
        <p style={{ fontSize: '48px', fontWeight: 800, color: cor, lineHeight: 1, letterSpacing: '-0.02em' }}>{valor}</p>
        {sub && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>{sub}</p>}
      </div>
    </div>
  )

  const box = (children, extra = {}) => (
    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-sm), var(--glow-card)', borderRadius: '16px', padding: '28px', ...extra }}>
      {children}
    </div>
  )

  // Preparar dados evolução (merge abertos + solucionados por dia)
  const evolMap = {}
  ;(dados?.evolucao || []).forEach(d => {
    const dt = typeof d.data === 'string' ? d.data.split('T')[0] : d.data
    evolMap[dt] = { ...(evolMap[dt] || {}), solucionados: d.solucionados }
  })
  ;(dados?.abertosdia || []).forEach(d => {
    const dt = typeof d.data === 'string' ? d.data.split('T')[0] : d.data
    evolMap[dt] = { ...(evolMap[dt] || {}), abertos: d.abertos }
  })
  const evolData = Object.entries(evolMap).sort().map(([data, v]) => {
    const partes = data.split('-')
    const label = partes.length === 3 ? `${partes[2]}/${partes[1]}` : data
    return { data: label, solucionados: v.solucionados || 0, abertos: v.abertos || 0 }
  })

  // Dados donut status
  const st = dados?.porStatus || {}
  const statusData = [
    { name: 'Novos', value: parseInt(st.novos) || 0, cor: '#3794fc' },
    { name: 'Atribuídos', value: parseInt(st.atribuidos) || 0, cor: '#30d987' },
    { name: 'Planejados', value: parseInt(st.planejados) || 0, cor: '#a037fc' },
    { name: 'Pendentes', value: parseInt(st.pendentes) || 0, cor: '#f59e0b' },
  ].filter(d => d.value > 0)

  return (
    <>
      <Header titulo="GLPI — Business Intelligence" subtitulo={`Grupo GLPI_TI | Ultimos ${dias} dias`} />

      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-page)' }}>
        <div className="page-content" style={{ maxWidth: '1600px', margin: '0 auto' }}>

          {/* IA Panel — Agrupamento + Previsão */}
          <GlpiAiPanel />

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', borderRadius: '12px', padding: '6px', boxShadow: 'var(--shadow-xs)' }}>
              <Calendar style={{ width: '16px', height: '16px', margin: '0 10px', color: 'var(--text-muted)' }} />
              {[7, 15, 30, 60, 90].map(d => (
                <button key={d} onClick={() => setDias(d)} style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 150ms', backgroundColor: dias === d ? '#017efa' : 'transparent', color: dias === d ? '#ffffff' : 'var(--text-muted)' }}>{d}d</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={carregar} style={{ padding: '8px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, backgroundColor: '#017efa', color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 150ms' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                Atualizar
              </button>
              <button
                onClick={enviarEmail}
                disabled={enviandoEmail}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, backgroundColor: enviandoEmail ? '#5a7a52' : '#367C2B', color: '#fff', border: 'none', cursor: enviandoEmail ? 'not-allowed' : 'pointer', transition: 'all 150ms', opacity: enviandoEmail ? 0.75 : 1 }}
                onMouseEnter={(e) => { if (!enviandoEmail) e.currentTarget.style.backgroundColor = '#1D5016' }}
                onMouseLeave={(e) => { if (!enviandoEmail) e.currentTarget.style.backgroundColor = '#367C2B' }}>
                <Mail style={{ width: '14px', height: '14px' }} />
                {enviandoEmail ? 'Enviando...' : 'Enviar Relatório'}
              </button>
              <ExportButton />
            </div>
          </div>

          {/* SLA Gradient Banner — regra Qlik */}
          <div style={{
            background: 'var(--gradient-blue)', borderRadius: '16px', padding: '28px 36px',
            marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', bottom: '-40px', right: '80px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>SLA Solucao</p>
              <p style={{ fontSize: '52px', fontWeight: 800, color: '#ffffff', lineHeight: 1, letterSpacing: '-0.02em' }}>{r.slaPct || 0}%</p>
            </div>
            <div style={{ display: 'flex', gap: '32px', position: 'relative', zIndex: 1 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>{r.abertos || 0}</p>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Abertos</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>{r.envelhecidos || 0}</p>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>&gt;45 dias</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>{r.reaberturas || 0}</p>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Reaberturas</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>{r.solucionadosPeriodo || 0}</p>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Solucionados</p>
              </div>
            </div>
          </div>

          {/* KPIs — linha 1 */}
          <div className="grid-4" style={{ marginBottom: '16px' }}>
            {card(<Monitor style={{ width: '16px', height: '16px', color: '#fc381d' }} />, 'Chamados Abertos', r.abertos, '#fc381d', `${r.envelhecidos} com mais de 45 dias`)}
            {card(<CheckCircle2 style={{ width: '16px', height: '16px', color: '#30d987' }} />, 'Solucionados Hoje', r.solucionadosHoje, '#30d987', `${r.fechadosHoje} fechados hoje`)}
            {card(<Clock style={{ width: '16px', height: '16px', color: '#3794fc' }} />, 'Tempo Medio Solucao', `${r.tempoMedioSolucao ?? 0}h`, '#3794fc', `Primeira resposta: ${r.tempoMedioResposta ?? 0}h`)}
            {card(<TrendingUp style={{ width: '16px', height: '16px', color: '#a037fc' }} />, `Solucionados ${dias}d`, r.solucionadosPeriodo, '#a037fc')}
          </div>

          {/* KPIs — linha 2 (médias) */}
          <div className="grid-3" style={{ marginBottom: '28px' }}>
            {card(<Monitor style={{ width: '16px', height: '16px', color: '#f59e0b' }} />, 'Media Abertos/Dia', dados?.medias?.abertosdia || 0, '#f59e0b', 'Chamados novos por dia')}
            {card(<CheckCircle2 style={{ width: '16px', height: '16px', color: '#30d987' }} />, 'Media Solucionados/Dia', dados?.medias?.solucionadosdia || 0, '#30d987', 'Fechamentos por dia')}
            {card(<Clock style={{ width: '16px', height: '16px', color: '#6342ff' }} />, 'Tempo 1o Atendimento', `${dados?.medias?.tempoPrimeiroAtendimento || 0}h`, '#6342ff', 'Media ate primeira resposta')}
          </div>

          {/* Evolução diária (abertos vs solucionados) + Status donut */}
          <div className="grid-2-1" style={{ marginBottom: '28px' }}>
            {box(
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>Abertos vs Solucionados por Dia</h3>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {[{ l: 'Abertos', c: '#fc381d' }, { l: 'Solucionados', c: '#30d987' }].map(({ l, c }) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: c }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ height: '280px', padding: '4px', borderRadius: '12px', backgroundColor: 'var(--bg-inset)', boxShadow: 'var(--shadow-inset)' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evolData} margin={{ top: 8, right: 8, left: -12, bottom: 4 }} barCategoryGap="30%">
                      <CartesianGrid vertical={false} stroke="#e5e9f2" />
                      <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="abertos" name="Abertos" fill="#fc381d" radius={[4, 4, 0, 0]} barSize={14} />
                      <Bar dataKey="solucionados" name="Solucionados" fill="#30d987" radius={[4, 4, 0, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {box(
              <>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '16px' }}>Status dos Abertos</h3>
                <div style={{ height: '240px', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={105} innerRadius={72} strokeWidth={3} stroke="var(--bg-card)">
                        {statusData.map((e, i) => <Cell key={i} fill={e.cor} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>{r.abertos}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Abertos</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px', justifyContent: 'center' }}>
                  {statusData.map(s => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.cor }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.name}: <strong style={{ color: 'var(--text-heading)' }}>{s.value}</strong></span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Atendentes + Categorias (lado a lado) */}
          <div className="grid-1-1" style={{ marginBottom: '28px' }}>
            {/* Top Atendentes */}
            {box(
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Users style={{ width: '18px', height: '18px', color: '#3794fc' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>Top Atendentes</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>Solucionados ({dias}d)</span>
                </div>
                {(dados?.atendentes || []).map((a, i) => {
                  const max = dados.atendentes[0]?.resolvidos || 1
                  const tempoInfo = (dados?.tempoAtendentes || []).find(t => t.nome === a.nome)
                  const gradients = [
                    'linear-gradient(90deg, #3794fc, #6342ff)',
                    'linear-gradient(90deg, #fc381d, #f59e0b)',
                    'linear-gradient(90deg, #30d987, #22d3ee)',
                    'linear-gradient(90deg, #a037fc, #fd1f9b)',
                    'linear-gradient(90deg, #f59e0b, #eab308)',
                    'linear-gradient(90deg, #51cbff, #017efa)',
                    'linear-gradient(90deg, #fd1f9b, #a037fc)',
                    'linear-gradient(90deg, #6342ff, #3794fc)',
                  ]
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', width: '22px', flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', width: '140px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome}</span>
                      <div style={{ flex: 1, height: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-inset)', overflow: 'hidden', boxShadow: 'var(--shadow-inset)' }}>
                        <div style={{ height: '100%', borderRadius: '6px', width: `${(a.resolvidos / max) * 100}%`, background: gradients[i % gradients.length], transition: 'width 600ms' }} />
                      </div>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-heading)', width: '40px', textAlign: 'right' }}>{a.resolvidos}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: tempoInfo && tempoInfo.mediaHoras > 48 ? '#fc381d' : 'var(--text-muted)', width: '50px', textAlign: 'right', flexShrink: 0 }} title="Tempo medio de solucao">{tempoInfo ? `${tempoInfo.mediaHoras}h` : '-'}</span>
                    </div>
                  )
                })}
              </>
            )}

            {/* Top Categorias */}
            {box(
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <AlertTriangle style={{ width: '18px', height: '18px', color: '#f59e0b' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>Top Categorias</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>Abertos</span>
                </div>
                {(dados?.categorias || []).map((c, i) => {
                  const max = dados.categorias[0]?.qtd || 1
                  const nome = c.categoria.split(' > ').pop()
                  const gradients = [
                    'linear-gradient(90deg, #f59e0b, #eab308)',
                    'linear-gradient(90deg, #fc381d, #f59e0b)',
                    'linear-gradient(90deg, #a037fc, #6342ff)',
                    'linear-gradient(90deg, #3794fc, #51cbff)',
                    'linear-gradient(90deg, #30d987, #22d3ee)',
                    'linear-gradient(90deg, #fd1f9b, #a037fc)',
                    'linear-gradient(90deg, #6342ff, #3794fc)',
                    'linear-gradient(90deg, #51cbff, #017efa)',
                  ]
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', width: '22px', flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', width: '200px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.categoria}>{nome}</span>
                      <div style={{ flex: 1, height: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-inset)', overflow: 'hidden', boxShadow: 'var(--shadow-inset)' }}>
                        <div style={{ height: '100%', borderRadius: '6px', width: `${(c.qtd / max) * 100}%`, background: gradients[i % gradients.length], transition: 'width 600ms' }} />
                      </div>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-heading)', width: '40px', textAlign: 'right' }}>{c.qtd}</span>
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* Urgências */}
          {box(
            <>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '20px' }}>Por Urgencia</h3>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${(dados?.urgencias || []).length}, 1fr)`, gap: '16px' }}>
                {(dados?.urgencias || []).map((u, i) => {
                  const cor = u.nome.includes('alta') || u.nome.includes('Alta') ? '#fc381d' : u.nome.includes('Média') ? '#f59e0b' : '#30d987'
                  return (
                    <div key={i} style={{ textAlign: 'center', padding: '16px', borderRadius: '12px', backgroundColor: `${cor}10`, border: `1px solid ${cor}30` }}>
                      <p style={{ fontSize: '32px', fontWeight: 800, color: cor, lineHeight: 1 }}>{u.qtd}</p>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '8px' }}>{u.nome}</p>
                    </div>
                  )
                })}
              </div>
            </>
          , { marginBottom: '28px' })}

          {/* SLA — gauge + tendência semanal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '28px' }}>
            {/* SLA Gauge */}
            {box(
              <>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '20px' }}>SLA — Cumprimento</h3>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto' }}>
                    <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-inset)" strokeWidth="10" />
                      <circle cx="50" cy="50" r="40" fill="none"
                        stroke={dados?.sla?.percentual >= 80 ? '#30d987' : dados?.sla?.percentual >= 60 ? '#f59e0b' : '#fc381d'}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${(dados?.sla?.percentual || 0) * 2.51327} 251.327`} />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '32px', fontWeight: 800, color: dados?.sla?.percentual >= 80 ? '#30d987' : dados?.sla?.percentual >= 60 ? '#f59e0b' : '#fc381d' }}>{dados?.sla?.percentual || 0}%</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '20px', fontWeight: 800, color: '#30d987' }}>{dados?.sla?.dentro || 0}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Dentro SLA</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '20px', fontWeight: 800, color: '#fc381d' }}>{dados?.sla?.fora || 0}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fora SLA</p>
                  </div>
                </div>
              </>
            )}

            {/* SLA Tendência semanal */}
            {box(
              <>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '20px' }}>SLA — Tendencia Semanal</h3>
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dados?.slaTendencia || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#e5e9f2" />
                      <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${v}%`} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={85} stroke="#fc381d" strokeDasharray="6 4" strokeWidth={2} label={{ value: 'Meta 85%', position: 'insideTopRight', fill: '#fc381d', fontSize: 11, fontWeight: 700 }} />
                      <Line type="monotone" dataKey="pct" name="SLA %" stroke="#3794fc" strokeWidth={3} dot={{ r: 5, fill: '#3794fc', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Tipo (Incidente vs Requisição) + Tempo por Categoria */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '28px' }}>
            {/* Tipo */}
            {box(
              <>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '20px' }}>Por Tipo</h3>
                {(dados?.tipos || []).map((t, i) => {
                  const cor = t.nome === 'Incidente' ? '#fc381d' : '#3794fc'
                  const grad = t.nome === 'Incidente' ? 'var(--gradient-red)' : 'var(--gradient-blue)'
                  const total = (dados?.tipos || []).reduce((a, x) => a + x.qtd, 0)
                  const pct = total > 0 ? ((t.qtd / total) * 100).toFixed(1) : 0
                  return (
                    <div key={i} style={{ marginBottom: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-heading)' }}>{t.nome}</span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: cor }}>{t.qtd} ({pct}%)</span>
                      </div>
                      <div style={{ height: '14px', borderRadius: '7px', backgroundColor: 'var(--bg-inset)', overflow: 'hidden', boxShadow: 'var(--shadow-inset)' }}>
                        <div style={{ height: '100%', borderRadius: '7px', width: `${pct}%`, background: grad, transition: 'width 600ms' }} />
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Tempo médio por categoria */}
            {box(
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Clock style={{ width: '18px', height: '18px', color: '#f59e0b' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>Tempo Medio por Categoria</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>Horas (min 3 tickets)</span>
                </div>
                <div style={{ height: '240px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...(dados?.tempoPorCategoria || [])].reverse()} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid horizontal={false} stroke="#e5e9f2" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `${v}h`} />
                      <YAxis type="category" dataKey="categoria" width={140} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-heading)' }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="mediaHoras" name="Media (h)" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Backlog acumulado */}
          {box(
            <>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '20px' }}>Backlog — Evolucao Acumulada</h3>
              <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(dados?.backlog || []).map(b => ({ ...b, data: b.data.split('-').slice(1).reverse().join('/') }))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e5e9f2" />
                    <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="backlog" name="Backlog" stroke="#a037fc" strokeWidth={2.5} dot={{ r: 3, fill: '#a037fc' }} />
                    <Line type="monotone" dataKey="abertos" name="Abertos" stroke="#fc381d" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="solucionados" name="Solucionados" stroke="#30d987" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px' }}>
                {[{ l: 'Backlog', c: '#a037fc' }, { l: 'Abertos/dia', c: '#fc381d' }, { l: 'Solucionados/dia', c: '#30d987' }].map(({ l, c }) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '3px', borderRadius: '2px', backgroundColor: c }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l}</span>
                  </div>
                ))}
              </div>
            </>
          , { marginBottom: '28px' })}

          {/* Comparacao Mensal — Feature 6 */}
          {comparacao && box(
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <Calendar style={{ width: '18px', height: '18px', color: '#3794fc' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>Comparacao Mensal</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{comparacao.mesAnterior.nome}/{comparacao.mesAnterior.ano} vs {comparacao.mesAtual.nome}/{comparacao.mesAtual.ano}</span>
              </div>
              <div className="grid-4">
                {[
                  { label: 'Abertos', anterior: comparacao.mesAnterior.abertos, atual: comparacao.mesAtual.abertos, variacao: comparacao.variacao.abertos, invertido: true },
                  { label: 'Solucionados', anterior: comparacao.mesAnterior.solucionados, atual: comparacao.mesAtual.solucionados, variacao: comparacao.variacao.solucionados, invertido: false },
                  { label: 'SLA %', anterior: `${comparacao.mesAnterior.slaPct}%`, atual: `${comparacao.mesAtual.slaPct}%`, variacao: comparacao.variacao.slaPct, invertido: false, isSla: true },
                  { label: 'Tempo Medio (h)', anterior: `${comparacao.mesAnterior.tempoMedio}h`, atual: `${comparacao.mesAtual.tempoMedio}h`, variacao: comparacao.variacao.tempoMedio, invertido: true },
                ].map((m, i) => {
                  const isPositive = m.isSla ? m.variacao >= 0 : m.variacao > 0
                  const corVariacao = m.invertido
                    ? (m.variacao > 0 ? '#fc381d' : m.variacao < 0 ? '#30d987' : 'var(--text-muted)')
                    : (m.variacao > 0 ? '#30d987' : m.variacao < 0 ? '#fc381d' : 'var(--text-muted)')
                  const seta = m.variacao > 0 ? '\u2191' : m.variacao < 0 ? '\u2193' : '-'
                  return (
                    <div key={i} style={{ textAlign: 'center', padding: '20px 16px', borderRadius: '12px', backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-glow)' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>{m.label}</p>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{comparacao.mesAnterior.nome.slice(0, 3)}</p>
                          <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-secondary)' }}>{m.anterior}</p>
                        </div>
                        <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>&rarr;</span>
                        <div>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{comparacao.mesAtual.nome.slice(0, 3)}</p>
                          <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-heading)' }}>{m.atual}</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: corVariacao }}>{seta} {Math.abs(m.variacao)}%</p>
                    </div>
                  )
                })}
              </div>
            </>
          , { marginBottom: '28px' })}

          {/* Previsao de Fechamento — Feature 8 */}
          {comparacao?.previsaoFechamento && box(
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <TrendingUp style={{ width: '18px', height: '18px', color: '#a037fc' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>Previsao de Fechamento do Mes</h3>
              </div>
              <div className="grid-4">
                <div style={{ textAlign: 'center', padding: '20px 16px', borderRadius: '12px', background: 'var(--gradient-blue)', color: '#fff' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Projecao Solucionados</p>
                  <p style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1 }}>{comparacao.previsaoFechamento.solucionadosProjetados}</p>
                  <p style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>
                    {comparacao.previsaoFechamento.solucionadosProjetados > comparacao.mesAnterior.solucionados ? '\u2191' : '\u2193'} vs {comparacao.mesAnterior.solucionados} mes anterior
                  </p>
                </div>
                <div style={{ textAlign: 'center', padding: '20px 16px', borderRadius: '12px', backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-glow)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Media Diaria</p>
                  <p style={{ fontSize: '36px', fontWeight: 800, color: '#30d987', lineHeight: 1 }}>{comparacao.previsaoFechamento.mediaDiaria}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>solucionados/dia</p>
                </div>
                <div style={{ textAlign: 'center', padding: '20px 16px', borderRadius: '12px', backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-glow)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Dias Uteis Restantes</p>
                  <p style={{ fontSize: '36px', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{comparacao.previsaoFechamento.diasUteisRestantes}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>de {comparacao.previsaoFechamento.totalDiasMes - comparacao.previsaoFechamento.diaAtual} restantes</p>
                </div>
                <div style={{ textAlign: 'center', padding: '20px 16px', borderRadius: '12px', backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-glow)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Progresso do Mes</p>
                  <p style={{ fontSize: '36px', fontWeight: 800, color: '#3794fc', lineHeight: 1 }}>{Math.round((comparacao.previsaoFechamento.diaAtual / comparacao.previsaoFechamento.totalDiasMes) * 100)}%</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>dia {comparacao.previsaoFechamento.diaAtual}/{comparacao.previsaoFechamento.totalDiasMes}</p>
                </div>
              </div>
            </>
          , { marginBottom: '28px' })}

          {/* Top Solicitantes — Feature 9 */}
          {(dados?.topSolicitantes || []).length > 0 && box(
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Users style={{ width: '18px', height: '18px', color: '#fd1f9b' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>Top Solicitantes</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>Quem mais abre chamados ({dias}d)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px' }}>
                {(dados?.topSolicitantes || []).map((s, i) => {
                  const max = dados.topSolicitantes[0]?.total || 1
                  const gradients = [
                    'linear-gradient(90deg, #fd1f9b, #a037fc)',
                    'linear-gradient(90deg, #a037fc, #6342ff)',
                    'linear-gradient(90deg, #6342ff, #3794fc)',
                    'linear-gradient(90deg, #3794fc, #51cbff)',
                    'linear-gradient(90deg, #51cbff, #30d987)',
                    'linear-gradient(90deg, #30d987, #22d3ee)',
                    'linear-gradient(90deg, #f59e0b, #eab308)',
                    'linear-gradient(90deg, #fc381d, #f59e0b)',
                    'linear-gradient(90deg, #fd1f9b, #fc381d)',
                    'linear-gradient(90deg, #a037fc, #fd1f9b)',
                  ]
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', width: '22px', flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', width: '160px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nome}</span>
                      <div style={{ flex: 1, height: '10px', borderRadius: '5px', backgroundColor: 'var(--bg-inset)', overflow: 'hidden', boxShadow: 'var(--shadow-inset)' }}>
                        <div style={{ height: '100%', borderRadius: '5px', width: `${(s.total / max) * 100}%`, background: gradients[i % gradients.length], transition: 'width 600ms' }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-heading)', width: '36px', textAlign: 'right' }}>{s.total}</span>
                    </div>
                  )
                })}
              </div>
            </>
          , { marginBottom: '28px' })}

          {/* Métricas por Categoria (VPN, Reset Senha, etc) */}
          {metCat && (
            <>
              {box(
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>Chamados por Categoria</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ultimos {dias} dias</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--bg-inset)' }}>
                          {['Categoria', 'Total', 'Abertos', 'Mes Atual', 'Media/Mes'].map(c => (
                            <th key={c} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(metCat.categorias || []).map((c, i) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: i % 2 === 1 ? 'var(--bg-inset)' : 'transparent' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c.cor, flexShrink: 0 }} />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-heading)' }}>{c.nome}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '16px', fontWeight: 800, color: 'var(--text-heading)' }}>{c.total}</td>
                            <td style={{ padding: '12px 16px', fontSize: '16px', fontWeight: 800, color: c.abertos > 0 ? '#fc381d' : 'var(--text-muted)' }}>{c.abertos}</td>
                            <td style={{ padding: '12px 16px', fontSize: '16px', fontWeight: 800, color: '#017efa' }}>{c.mesAtual}</td>
                            <td style={{ padding: '12px 16px', fontSize: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>{c.mediaMensal}/mes</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              , { marginBottom: '28px' })}

              {/* Evolução mensal VPN vs Reset Senha vs Gestão Acesso */}
              {metCat.evolucaoMensal && metCat.evolucaoMensal.length > 0 && box(
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>Evolucao Mensal por Tipo</h3>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      {[{ l: 'VPN', c: '#017efa' }, { l: 'Reset Senha', c: '#f59e0b' }, { l: 'Gestao Acesso', c: '#a037fc' }].map(({ l, c }) => (
                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: c }} />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ height: '260px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metCat.evolucaoMensal.map(e => ({ ...e, mes: e.mes?.substring(5) || e.mes }))} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barCategoryGap="25%">
                        <CartesianGrid vertical={false} stroke="#e5e9f2" />
                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="vpn" name="VPN" fill="#017efa" radius={[4, 4, 0, 0]} barSize={18} />
                        <Bar dataKey="reset_senha" name="Reset Senha" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={18} />
                        <Bar dataKey="gestao_acesso" name="Gestao Acesso" fill="#a037fc" radius={[4, 4, 0, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              , { marginBottom: '28px' })}
            </>
          )}

        </div>
      </main>
    </>
  )
}
