/**
 * Painel de IA para página GLPI
 * Feature 4: Agrupamento inteligente de chamados
 * Feature 5: Previsão de volume 7 dias
 */
import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, TrendingUp, Tags } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { aiAPI } from '../../services/api'

function formatarData(dataStr) {
  const d = new Date(dataStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
}

const corConfianca = (c) => c === 'alta' ? '#367C2B' : c === 'media' ? '#f59e0b' : '#94a3b8'

export default function GlpiAiPanel() {
  const [grupos, setGrupos] = useState([])
  const [previsao, setPrevisao] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroGrupos, setErroGrupos] = useState(null)
  const [erroPrevisao, setErroPrevisao] = useState(null)
  const [avisoGrupos, setAvisoGrupos] = useState(null)
  const [avisoPrevisao, setAvisoPrevisao] = useState(null)

  const carregar = async () => {
    setCarregando(true)
    setErroGrupos(null)
    setErroPrevisao(null)

    await Promise.allSettled([
      aiAPI.resumoChamados()
        .then(({ data }) => {
          setGrupos(data.grupos || [])
          if (data.aviso) setAvisoGrupos(data.aviso)
        })
        .catch(() => setErroGrupos('Agrupamento indisponível')),

      aiAPI.previsao()
        .then(({ data }) => {
          setPrevisao(data.previsao || [])
          if (data.aviso) setAvisoPrevisao(data.aviso)
        })
        .catch(() => setErroPrevisao('Previsão indisponível')),
    ])
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  const dadosChart = previsao.map(p => ({
    data: formatarData(p.data),
    previsao: p.previsao,
    confianca: p.confianca,
    fill: corConfianca(p.confianca),
  }))

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
      marginBottom: '24px',
    }}>
      {/* Feature 4: Agrupamento */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', padding: '18px', minHeight: '220px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #367C2B, #4aaa38)' }}>
            <Tags style={{ width: '14px', height: '14px', color: '#fff' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1 }}>Agrupamento Inteligente</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Chamados abertos por tema</p>
          </div>
          <button onClick={carregar} disabled={carregando} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
            <RefreshCw style={{ width: '13px', height: '13px', animation: carregando ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        {carregando ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: '32px', borderRadius: '8px', backgroundColor: 'var(--bg-inset)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
          </div>
        ) : erroGrupos || avisoGrupos ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
            <div><Sparkles style={{ width: '20px', height: '20px', marginBottom: '8px', opacity: 0.4 }} /><br />{erroGrupos || avisoGrupos}</div>
          </div>
        ) : grupos.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>Nenhum chamado aberto</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {grupos.slice(0, 6).map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: '8px', backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#367C2B', width: '24px', textAlign: 'center', flexShrink: 0 }}>{g.quantidade}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.tema}</p>
                  {g.exemplos?.[0] && <p style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>{g.exemplos[0]}</p>}
                </div>
                <div style={{ width: `${Math.round((g.quantidade / (grupos[0]?.quantidade || 1)) * 60)}px`, height: '4px', borderRadius: '4px', backgroundColor: '#367C2B', opacity: 0.4, flexShrink: 0, minWidth: '4px' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature 5: Previsão */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', padding: '18px', minHeight: '220px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #FFDE00, #e6c800)' }}>
            <TrendingUp style={{ width: '14px', height: '14px', color: '#1D5016' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1 }}>Previsão de Volume</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Próximos 7 dias (IA)</p>
          </div>
        </div>

        {carregando ? (
          <div style={{ height: '140px', borderRadius: '8px', backgroundColor: 'var(--bg-inset)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ) : erroPrevisao || avisoPrevisao ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
            <div><TrendingUp style={{ width: '20px', height: '20px', marginBottom: '8px', opacity: 0.4 }} /><br />{erroPrevisao || avisoPrevisao}</div>
          </div>
        ) : dadosChart.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>Dados insuficientes para previsão</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={dadosChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="data" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}>
                        <p style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{d.data}</p>
                        <p style={{ color: '#367C2B' }}>Previsão: <strong>{d.previsao}</strong></p>
                        <p style={{ color: corConfianca(d.confianca) }}>Confiança: {d.confianca}</p>
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone" dataKey="previsao" stroke="#FFDE00" strokeWidth={2.5}
                  strokeDasharray="5 3"
                  dot={{ fill: '#FFDE00', r: 4, stroke: '#1D5016', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'center' }}>
              {[['alta', '#367C2B'], ['media', '#f59e0b'], ['baixa', '#94a3b8']].map(([k, c]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>Confiança {k}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  )
}
