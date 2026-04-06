/**
 * StatCard — 100% CSS inline
 */
const bgMap = {
  'var(--blue)': 'var(--blue-subtle)',
  'var(--green)': 'var(--green-subtle)',
  'var(--amber)': 'var(--amber-subtle)',
  'var(--red)': 'var(--red-subtle)',
}
const borderMap = {
  'var(--blue)': 'var(--blue-border)',
  'var(--green)': 'var(--green-border)',
  'var(--amber)': 'var(--amber-border)',
  'var(--red)': 'var(--red-border)',
}

export default function StatCard({ titulo, valor, sufixo = '', icone: Icone, cor, descricao }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        boxShadow: 'var(--shadow-sm)',
        borderRadius: '12px',
        padding: '20px 24px',
        transition: 'all 200ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>{titulo}</p>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.1 }}>{valor}</span>
            {sufixo && <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>{sufixo}</span>}
          </div>
          {descricao && <p style={{ fontSize: '11px', marginTop: '6px', color: 'var(--text-muted)' }}>{descricao}</p>}
        </div>
        {Icone && (
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: bgMap[cor] || 'var(--bg-inset)',
            border: `1px solid ${borderMap[cor] || 'var(--border)'}`,
          }}>
            <Icone style={{ width: '20px', height: '20px', color: cor }} strokeWidth={1.8} />
          </div>
        )}
      </div>
    </div>
  )
}
