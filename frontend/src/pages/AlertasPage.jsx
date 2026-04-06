/**
 * Alertas — 100% CSS inline
 */
import { useState, useEffect } from 'react'
import { AlertTriangle, XCircle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react'
import Header from '../components/layout/Header'
import Card, { CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { dashboardAPI } from '../services/api'

function AlertaCard({ alerta }) {
  const config = {
    critico: { Ic: XCircle, cor: 'var(--red)', bg: 'var(--red-subtle)', border: 'var(--red-border)', lbl: 'CRITICO' },
    aviso: { Ic: AlertTriangle, cor: 'var(--amber)', bg: 'var(--amber-subtle)', border: 'var(--amber-border)', lbl: 'AVISO' },
  }
  const { Ic, cor, bg, border, lbl } = config[alerta.tipo] || config.aviso

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', borderRadius: '12px', backgroundColor: bg, border: `1px solid ${border}`, transition: 'opacity 150ms' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'var(--bg-card)', border: `1px solid ${border}` }}>
        <Ic style={{ width: '18px', height: '18px', color: cor }} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 8px', borderRadius: '999px', backgroundColor: bg, border: `1px solid ${border}`, color: cor }}>{lbl}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{alerta.rotina}</span>
        </div>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-heading)' }}>{alerta.mensagem}</p>
        {alerta.ultimaExecucao && (
          <p style={{ fontSize: '11px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
            <Clock style={{ width: '12px', height: '12px' }} /> {new Date(alerta.ultimaExecucao + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
    </div>
  )
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { dashboardAPI.obterAlertas().then(({ data }) => setAlertas(data.dados || [])).catch(console.error).finally(() => setLoading(false)) }, [])

  const criticos = alertas.filter(a => a.tipo === 'critico')
  const avisos = alertas.filter(a => a.tipo === 'aviso')

  if (loading) return (
    <>
      <Header titulo="Alertas" subtitulo="Carregando..." />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--blue)' }} />
      </div>
    </>
  )

  const kpis = [
    { Ic: ShieldAlert, v: criticos.length, l: 'Criticos', cor: 'var(--red)', bg: 'var(--red-subtle)', border: 'var(--red-border)' },
    { Ic: AlertTriangle, v: avisos.length, l: 'Avisos', cor: 'var(--amber)', bg: 'var(--amber-subtle)', border: 'var(--amber-border)' },
    { Ic: CheckCircle2, v: alertas.length === 0 ? 'OK' : '-', l: alertas.length === 0 ? 'Tudo operacional' : 'Atencao', cor: 'var(--green)', bg: 'var(--green-subtle)', border: 'var(--green-border)' },
  ]

  return (
    <>
      <Header titulo="Alertas" subtitulo={`${alertas.length} ativo${alertas.length !== 1 ? 's' : ''}`} />
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-page)' }}>
        <div className="page-content" style={{ maxWidth: '1000px', margin: '0 auto' }}>

          <div className="grid-3" style={{ marginBottom: '24px' }}>
            {kpis.map(({ Ic, v, l, cor, bg, border }) => (
              <div key={l} style={{
                backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-sm), var(--glow-card)',
                borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 200ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: bg, border: `1px solid ${border}` }}>
                  <Ic style={{ width: '20px', height: '20px', color: cor }} strokeWidth={1.8} />
                </div>
                <div>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: cor, lineHeight: 1.1 }}>{v}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{l}</p>
                </div>
              </div>
            ))}
          </div>

          {alertas.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Alertas Ativos</CardTitle>
                <CardDescription>Monitoramento automatico de rotinas</CardDescription>
              </CardHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alertas.map((a, i) => <AlertaCard key={i} alerta={a} />)}
              </div>
            </Card>
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: '80px 16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', backgroundColor: 'var(--green-subtle)', border: '1px solid var(--green-border)' }}>
                  <CheckCircle2 style={{ width: '28px', height: '28px', color: 'var(--green)' }} strokeWidth={1.5} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-heading)' }}>Nenhum alerta ativo</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>Todas as rotinas estao funcionando normalmente.</p>
              </div>
            </Card>
          )}
        </div>
      </main>
    </>
  )
}
