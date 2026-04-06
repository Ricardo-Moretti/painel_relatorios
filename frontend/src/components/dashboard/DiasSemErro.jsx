/**
 * DiasSemErro — Streak de dias sem erro por rotina — 100% CSS inline
 */
import { Shield, Flame } from 'lucide-react'

function getColor(dias) {
  if (dias >= 7) return { main: 'var(--green)', subtle: 'var(--green-subtle)', border: 'var(--green-border)' }
  if (dias >= 3) return { main: 'var(--amber)', subtle: 'var(--amber-subtle)', border: 'var(--amber-border)' }
  return { main: 'var(--red)', subtle: 'var(--red-subtle)', border: 'var(--red-border)' }
}

function getIcon(dias) {
  return dias >= 7 ? Shield : Flame
}

export default function DiasSemErro({ dados = [] }) {
  return (
    <div>
      <h3
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--text-heading)',
          letterSpacing: '-0.01em',
          marginBottom: '16px',
        }}
      >
        Dias sem Falha
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {dados.map((item) => {
          const cor = getColor(item.dias_sem_erro)
          const Icone = getIcon(item.dias_sem_erro)

          return (
            <div
              key={item.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                boxShadow: 'var(--shadow-sm)',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 200ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                    maxWidth: '110px',
                  }}
                >
                  {item.nome}
                </p>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: cor.subtle,
                    border: `1px solid ${cor.border}`,
                    flexShrink: 0,
                  }}
                >
                  <Icone
                    style={{ width: '18px', height: '18px', color: cor.main }}
                    strokeWidth={1.8}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: cor.main,
                    lineHeight: 1.1,
                  }}
                >
                  {item.dias_sem_erro}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                  dias
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
