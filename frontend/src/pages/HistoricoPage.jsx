/**
 * Historico — 100% CSS inline
 */
import { useState, useEffect } from 'react'
import { BarChart3 } from 'lucide-react'
import Header from '../components/layout/Header'
import Card, { CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { dashboardAPI } from '../services/api'
import { formatarData } from '../lib/utils'

function HeatmapCirculos({ dados = [] }) {
  const [tip, setTip] = useState(null)
  const porRotina = {}
  dados.forEach(({ rotina, data, status }) => { if (!porRotina[rotina]) porRotina[rotina] = {}; porRotina[rotina][data] = status })
  const diasArray = []
  for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); diasArray.push(d.toISOString().split('T')[0]) }
  const cor = (s) => s === 'Sucesso' ? 'var(--green)' : s === 'Erro' ? 'var(--red)' : s === 'Parcial' ? 'var(--amber)' : 'var(--border)'
  const rotinas = Object.keys(porRotina).sort()

  return (
    <div style={{ position: 'relative' }}>
      {tip && <div className="animate-fade-in" style={{ position: 'fixed', zIndex: 50, left: tip.x + 12, top: tip.y - 8, padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 500, pointerEvents: 'none', backgroundColor: 'var(--text-heading)', color: 'var(--bg-card)', boxShadow: 'var(--shadow-md)' }}>{tip.text}</div>}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '580px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '8px' }}>
            <div style={{ width: '112px', flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
              {diasArray.map((dia, i) => (
                <div key={dia} style={{ width: '16px', textAlign: 'center', flexShrink: 0 }}>
                  {i % 7 === 0 && <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>}
                </div>
              ))}
            </div>
          </div>
          {rotinas.map((rotina) => (
            <div key={rotina} style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ width: '112px', flexShrink: 0, fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }} title={rotina}>{rotina}</div>
              <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                {diasArray.map((dia) => (
                  <div key={dia} style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, backgroundColor: cor(porRotina[rotina][dia]), cursor: 'pointer', transition: 'transform 150ms' }}
                    onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, text: `${rotina} — ${formatarData(dia)}: ${porRotina[rotina][dia] || 'Sem dados'}` })}
                    onMouseLeave={() => setTip(null)} />
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
            {[{ l: 'Sucesso', c: 'var(--green)' }, { l: 'Erro', c: 'var(--red)' }, { l: 'Parcial', c: 'var(--amber)' }, { l: 'Sem dados', c: 'var(--border)' }].map(({ l, c }) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: c }} />
                <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AnaliseMensal({ dados = [] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-inset)', borderBottom: '1px solid var(--border)' }}>
            {['Mes', 'Total', 'Sucesso', 'Erro', 'Parcial', '% Sucesso'].map((c) => (
              <th key={c} style={{ textAlign: 'left', padding: '12px 20px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((m, i) => {
            const pct = m.total ? ((m.sucesso / m.total) * 100).toFixed(1) : 0
            const corB = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)'
            return (
              <tr key={m.mes} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: i % 2 === 1 ? 'var(--bg-inset)' : 'transparent', transition: 'background 100ms' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = i % 2 === 1 ? 'var(--bg-inset)' : 'transparent'}>
                <td style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 500, color: 'var(--text-heading)' }}>{m.mes}</td>
                <td style={{ padding: '12px 20px', fontSize: '12px', color: 'var(--text-secondary)' }}>{m.total}</td>
                <td style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--green)' }}>{m.sucesso}</td>
                <td style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--red)' }}>{m.erro}</td>
                <td style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--amber)' }}>{m.parcial}</td>
                <td style={{ padding: '12px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '80px', height: '8px', borderRadius: '999px', backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-light)' }}>
                      <div style={{ height: '100%', borderRadius: '999px', width: `${pct}%`, backgroundColor: corB }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-heading)' }}>{pct}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {dados.length === 0 && <div style={{ textAlign: 'center', padding: '56px 16px' }}><p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Sem dados.</p></div>}
    </div>
  )
}

export default function HistoricoPage() {
  const [heatmap, setHeatmap] = useState([])
  const [mensal, setMensal] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([dashboardAPI.obterHeatmap(30), dashboardAPI.analiseMensal()])
      .then(([h, m]) => { setHeatmap(h.data.dados || []); setMensal(m.data.dados || []) })
      .catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <>
      <Header titulo="Historico" subtitulo="Carregando..." />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--blue)' }} />
      </div>
    </>
  )

  return (
    <>
      <Header titulo="Historico" subtitulo="Analise temporal" />
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-page)' }}>
        <div className="page-content" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <Card>
              <CardHeader>
                <CardTitle>Mapa de Execucoes — 30 dias</CardTitle>
                <CardDescription>Cada quadrado representa o status da rotina naquele dia</CardDescription>
              </CardHeader>
              <HeatmapCirculos dados={heatmap} />
            </Card>
          </div>

          <Card noPadding>
            <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--blue-subtle)', border: '1px solid var(--blue-border)' }}>
                <BarChart3 style={{ width: '16px', height: '16px', color: 'var(--blue)' }} />
              </div>
              <div><CardTitle>Analise Mensal</CardTitle><CardDescription>Performance consolidada por mes</CardDescription></div>
            </div>
            <AnaliseMensal dados={mensal} />
          </Card>
        </div>
      </main>
    </>
  )
}
