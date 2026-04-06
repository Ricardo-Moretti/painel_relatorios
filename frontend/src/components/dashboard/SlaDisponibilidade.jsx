/**
 * SlaDisponibilidade — SLA / Disponibilidade por rotina — 100% CSS inline
 */
import Card, { CardHeader, CardTitle, CardDescription } from '../ui/Card'

function getBarColor(pct) {
  if (pct >= 90) return { main: 'var(--green)', subtle: 'var(--green-subtle)', border: 'var(--green-border)' }
  if (pct >= 70) return { main: 'var(--amber)', subtle: 'var(--amber-subtle)', border: 'var(--amber-border)' }
  return { main: 'var(--red)', subtle: 'var(--red-subtle)', border: 'var(--red-border)' }
}

export default function SlaDisponibilidade({ dados = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA / Disponibilidade</CardTitle>
        <CardDescription>Percentual de disponibilidade por rotina</CardDescription>
      </CardHeader>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {dados.map((item) => {
          const pct = item.disponibilidade ?? 0
          const cor = getBarColor(pct)

          return (
            <div key={item.id}>
              {/* Row: nome + percentual */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-body)',
                  }}
                >
                  {item.nome}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: cor.main,
                    }}
                  >
                    {pct.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    ({item.sucesso}/{item.total})
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: cor.subtle,
                  border: `1px solid ${cor.border}`,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    height: '100%',
                    borderRadius: '4px',
                    backgroundColor: cor.main,
                    transition: 'width 600ms ease',
                  }}
                />
              </div>
            </div>
          )
        })}

        {dados.length === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            Nenhum dado disponivel
          </p>
        )}
      </div>
    </Card>
  )
}
