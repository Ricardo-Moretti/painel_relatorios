/**
 * Banner de Anomalias detectadas por IA
 * Auto-carrega ao montar, com cache de 15 minutos
 */
import { useState, useEffect } from 'react'
import { AlertTriangle, X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { aiAPI } from '../../services/api'

const CACHE_KEY = 'ai_anomalias_cache'
const CACHE_TTL = 15 * 60 * 1000 // 15 minutos

const corSeveridade = (s) => ({
  alta: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', badge: '#ef4444', text: '#ef4444' },
  media: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', badge: '#f59e0b', text: '#f59e0b' },
  baixa: { bg: 'rgba(54,124,43,0.06)', border: 'rgba(54,124,43,0.2)', badge: '#367C2B', text: '#367C2B' },
}[s] || { bg: 'var(--bg-inset)', border: 'var(--border)', badge: 'var(--text-muted)', text: 'var(--text-muted)' })

export default function AnomaliasBanner() {
  const [anomalias, setAnomalias] = useState([])
  const [dispensado, setDispensado] = useState(false)
  const [expandido, setExpandido] = useState(true)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const cache = (() => { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) } catch { return null } })()
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      setAnomalias(cache.anomalias)
      setCarregando(false)
      return
    }
    aiAPI.anomalias()
      .then(({ data }) => {
        const lista = data.anomalias || []
        setAnomalias(lista)
        localStorage.setItem(CACHE_KEY, JSON.stringify({ anomalias: lista, timestamp: Date.now() }))
      })
      .catch(() => setAnomalias([]))
      .finally(() => setCarregando(false))
  }, [])

  if (carregando || dispensado || anomalias.length === 0) return null

  const alta = anomalias.filter(a => a.severidade === 'alta').length

  return (
    <div style={{
      marginBottom: '20px', borderRadius: '12px',
      border: `1px solid ${alta > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
      backgroundColor: alta > 0 ? 'rgba(239,68,68,0.04)' : 'rgba(245,158,11,0.04)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpandido(e => !e)}
        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
      >
        <Sparkles style={{ width: '15px', height: '15px', color: alta > 0 ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)', flex: 1 }}>
          IA detectou {anomalias.length} anomalia{anomalias.length > 1 ? 's' : ''}
          {alta > 0 && <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 700, color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', padding: '2px 7px', borderRadius: '20px' }}>{alta} alta{alta > 1 ? 's' : ''}</span>}
        </span>
        {expandido ? <ChevronUp style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} /> : <ChevronDown style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />}
        <button
          onClick={e => { e.stopPropagation(); setDispensado(true) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', marginLeft: '4px' }}
        >
          <X style={{ width: '14px', height: '14px' }} />
        </button>
      </div>

      {/* Lista */}
      {expandido && (
        <div style={{ borderTop: `1px solid ${alta > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {anomalias.map((a, i) => {
            const c = corSeveridade(a.severidade)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 12px', borderRadius: '8px', backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
                <AlertTriangle style={{ width: '13px', height: '13px', color: c.text, marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: c.badge, backgroundColor: `${c.badge}18`, padding: '1px 6px', borderRadius: '4px', marginRight: '8px' }}>
                    {a.tipo}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{a.rotina}</span>
                  <p style={{ fontSize: '13px', color: 'var(--text-body)', marginTop: '4px', lineHeight: 1.4 }}>{a.descricao}</p>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: c.text, textTransform: 'uppercase', flexShrink: 0 }}>{a.severidade}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
