/**
 * SLA Detalhado — Análise profunda de chamados GLPI
 * Prioridade, atendente, urgência, antiguidade, volume semanal
 */
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { Shield, Clock, AlertTriangle, Users, Calendar, TrendingUp, Target, RotateCcw } from 'lucide-react'
import Header from '../components/layout/Header'
import { glpiAPI } from '../services/api'

const CORES = ['#017efa', '#30d987', '#f59e0b', '#fc381d', '#a037fc', '#51cbff', '#fd1f9b', '#6342ff']
const PRIO = { 1: 'Muito baixa', 2: 'Baixa', 3: 'Média', 4: 'Alta', 5: 'Muito alta' }

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ borderRadius: '10px', padding: '10px 14px', fontSize: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-lg)' }}>
      <p style={{ fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1px 0' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}: <strong style={{ color: 'var(--text-heading)' }}>{p.value}</strong></span>
        </div>
      ))}
    </div>
  )
}

export default function SlaDetalhadoPage() {
  const [dados, setDados] = useState(null)
  const [dias, setDias] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [dias])
  const carregar = async () => {
    setLoading(true)
    try { const { data } = await glpiAPI.obterSLADetalhado(dias); setDados(data.dados) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <>
      <Header titulo="SLA Detalhado" subtitulo="Carregando..." />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--blue)' }} />
      </main>
    </>
  )

  const box = (children, extra = {}) => (
    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-sm), var(--glow-card)', borderRadius: '16px', padding: '28px', ...extra }}>{children}</div>
  )

  const titulo = (icon, text) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
      {icon}
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>{text}</h3>
    </div>
  )

  const tp = dados?.tempoPorEtapa || {}
  const tempos = {
    mediaRespostaHoras: tp.media_primeira_resposta || tp.mediaRespostaHoras || 0,
    mediaSolucaoHoras: tp.media_solucao || tp.mediaSolucaoHoras || 0,
    mediaEsperaHoras: tp.media_espera || tp.mediaEsperaHoras || 0,
  }

  return (
    <>
      <Header titulo="SLA Detalhado" subtitulo={`Grupo GLPI_TI | Ultimos ${dias} dias`} />
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-page)' }}>
        <div className="page-content" style={{ maxWidth: '1600px', margin: '0 auto' }}>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', borderRadius: '12px', padding: '6px', boxShadow: 'var(--shadow-xs)' }}>
              <Calendar style={{ width: '16px', height: '16px', margin: '0 10px', color: 'var(--text-muted)' }} />
              {[7, 15, 30, 60, 90].map(d => (
                <button key={d} onClick={() => setDias(d)} style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 150ms', backgroundColor: dias === d ? '#017efa' : 'transparent', color: dias === d ? '#ffffff' : 'var(--text-muted)' }}>{d}d</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reaberturas: </span>
                <strong style={{ fontSize: '15px', color: '#fc381d' }}>{dados?.reaberturas?.total ?? dados?.reaberturas ?? 0}</strong>
              </div>
            </div>
          </div>

          {/* SLA Global — dois gauges (Solução vs Atendimento) */}
          {dados?.slaGlobal && (
            <div className="grid-1-1" style={{ marginBottom: '28px' }}>
              {[
                { label: 'SLA Solucao', data: dados.slaGlobal.slaSolucao, cor: '#017efa', desc: 'Tempo para resolver o chamado' },
                { label: 'SLA Atendimento', data: dados.slaGlobal.slaAtendimento, cor: '#30d987', desc: 'Tempo para iniciar atendimento' },
              ].map((sla, idx) => (
                <div key={idx} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '28px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-glow)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(135deg, ${sla.cor}, ${sla.cor}88)` }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>{sla.label}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>{sla.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
                    {/* Gauge */}
                    <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                      <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-inset)" strokeWidth="8" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke={sla.data.pct >= 80 ? sla.cor : sla.data.pct >= 60 ? '#f59e0b' : '#fc381d'} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${sla.data.pct * 2.51327} 251.327`} />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '26px', fontWeight: 800, color: sla.data.pct >= 80 ? sla.cor : sla.data.pct >= 60 ? '#f59e0b' : '#fc381d' }}>{sla.data.pct}%</span>
                      </div>
                    </div>
                    {/* Detalhes */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
                        <div><p style={{ fontSize: '24px', fontWeight: 800, color: '#30d987' }}>{sla.data.dentro}</p><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Dentro SLA</p></div>
                        <div><p style={{ fontSize: '24px', fontWeight: 800, color: '#fc381d' }}>{sla.data.fora}</p><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fora SLA</p></div>
                      </div>
                      <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-inset)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '4px', width: `${sla.data.pct}%`, background: `linear-gradient(90deg, ${sla.cor}, ${sla.cor}88)`, transition: 'width 600ms' }} />
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Total: {dados.slaGlobal.total} chamados no período</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* KPIs de tempo */}
          <div className="grid-3" style={{ marginBottom: '28px' }}>
            {[
              { icon: <Clock style={{ width: '18px', height: '18px', color: '#017efa' }} />, label: 'Tempo 1a Resposta', valor: `${tempos.mediaRespostaHoras || 0}h`, cor: '#017efa' },
              { icon: <Target style={{ width: '18px', height: '18px', color: '#30d987' }} />, label: 'Tempo Medio Solucao', valor: `${tempos.mediaSolucaoHoras || 0}h`, cor: '#30d987' },
              { icon: <RotateCcw style={{ width: '18px', height: '18px', color: '#f59e0b' }} />, label: 'Tempo em Espera', valor: `${tempos.mediaEsperaHoras || 0}h`, cor: '#f59e0b' },
            ].map((k, i) => (
              <div key={i} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-glow)', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(135deg, ${k.cor}, ${k.cor}88)` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>{k.icon}<span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{k.label}</span></div>
                <p style={{ fontSize: '40px', fontWeight: 800, color: k.cor, lineHeight: 1 }}>{k.valor}</p>
              </div>
            ))}
          </div>

          {/* SLA por Prioridade + SLA por Urgência x Tempo */}
          <div className="grid-1-1" style={{ marginBottom: '28px' }}>
            {box(
              <>
                {titulo(<Shield style={{ width: '18px', height: '18px', color: '#017efa' }} />, 'SLA por Prioridade')}
                {(dados?.slaPorPrioridade || []).map((p, i) => {
                  const pct = p.percentual || 0
                  const dentro = p.dentro_sla ?? p.dentro ?? 0
                  const cor = pct >= 80 ? '#30d987' : pct >= 60 ? '#f59e0b' : '#fc381d'
                  return (
                    <div key={i} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{p.nome}</span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: cor }}>{pct}% <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: '11px' }}>({dentro}/{p.total})</span></span>
                      </div>
                      <div style={{ height: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-inset)', boxShadow: 'var(--shadow-inset)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '6px', width: `${pct}%`, background: `linear-gradient(90deg, ${cor}, ${cor}aa)`, transition: 'width 600ms' }} />
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {box(
              <>
                {titulo(<AlertTriangle style={{ width: '18px', height: '18px', color: '#f59e0b' }} />, 'Urgencia x Tempo x SLA')}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        {['Urgencia', 'Qtd', 'Tempo medio', 'SLA %'].map(c => (
                          <th key={c} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(dados?.porUrgenciaTempo || []).map((u, i) => {
                        const slaPct = u.percentual_sla ?? u.slaPercentual ?? 0
                        const mediaH = u.media_horas ?? u.mediaHoras ?? 0
                        const cor = slaPct >= 80 ? '#30d987' : slaPct >= 60 ? '#f59e0b' : '#fc381d'
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 600, color: 'var(--text-heading)' }}>{u.nome}</td>
                            <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>{u.total}</td>
                            <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 700, color: '#017efa' }}>{mediaH}h</td>
                            <td style={{ padding: '12px 14px' }}><span style={{ fontSize: '14px', fontWeight: 800, color: cor }}>{slaPct}%</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* SLA por Atendente */}
          {box(
            <>
              {titulo(<Users style={{ width: '18px', height: '18px', color: '#a037fc' }} />, 'SLA por Atendente')}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--bg-inset)' }}>
                      {['#', 'Atendente', 'Total', 'Dentro SLA', 'Fora SLA', 'SLA %', ''].map(c => (
                        <th key={c} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(dados?.slaPorAtendente || []).map((a, i) => {
                      const pct = a.percentual || 0
                      const dentro = a.dentro_sla ?? a.dentro ?? 0
                      const fora = a.fora_sla ?? a.fora ?? 0
                      const cor = pct >= 80 ? '#30d987' : pct >= 60 ? '#f59e0b' : '#fc381d'
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: i % 2 === 1 ? 'var(--bg-inset)' : 'transparent' }}>
                          <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>{i + 1}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--text-heading)' }}>{a.nome}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>{a.total}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: '#30d987' }}>{dentro}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: '#fc381d' }}>{fora}</td>
                          <td style={{ padding: '12px 16px' }}><span style={{ fontSize: '15px', fontWeight: 800, color: cor }}>{pct}%</span></td>
                          <td style={{ padding: '12px 16px', width: '150px' }}>
                            <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-inset)', boxShadow: 'var(--shadow-inset)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: '4px', width: `${pct}%`, background: `linear-gradient(90deg, ${cor}, ${cor}88)`, transition: 'width 600ms' }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          , { marginBottom: '28px' })}

          {/* Top 10 mais antigos + Distribuição por hora */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px', marginBottom: '28px' }}>

            {box(
              <>
                {titulo(<Clock style={{ width: '18px', height: '18px', color: '#fc381d' }} />, 'Top 10 Chamados Mais Antigos')}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        {['ID', 'Titulo', 'Dias', 'Urgencia'].map(c => (
                          <th key={c} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(dados?.chamadosMaisAntigos || []).map((c, i) => {
                        const dias_c = c.idade_dias ?? c.idade ?? 0; const corDias = dias_c > 90 ? '#fc381d' : dias_c > 45 ? '#f59e0b' : '#017efa'
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#017efa' }}>#{c.id}</td>
                            <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-heading)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.titulo}>{c.titulo}</td>
                            <td style={{ padding: '10px 14px' }}><span style={{ fontSize: '14px', fontWeight: 800, color: corDias }}>{dias_c}d</span></td>
                            <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{c.urgencia}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {box(
              <>
                {titulo(<TrendingUp style={{ width: '18px', height: '18px', color: '#51cbff' }} />, 'Abertura por Hora do Dia')}
                <div style={{ height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dados?.distribuicaoPorHora || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#e5e9f2" />
                      <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `${v}h`} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="total" name="Chamados" fill="#51cbff" radius={[4, 4, 0, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Volume semanal */}
          {box(
            <>
              {titulo(<Calendar style={{ width: '18px', height: '18px', color: '#6342ff' }} />, 'Volume Semanal — Abertos vs Solucionados')}
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dados?.volumeSemanal || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barCategoryGap="25%">
                    <CartesianGrid vertical={false} stroke="#e5e9f2" />
                    <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="abertos" name="Abertos" fill="#fc381d" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="solucionados" name="Solucionados" fill="#30d987" radius={[4, 4, 0, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          , { marginBottom: '28px' })}

        </div>
      </main>
    </>
  )
}
