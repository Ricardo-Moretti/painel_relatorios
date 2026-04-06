/**
 * Donut Chart — 100% CSS inline
 */
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import Card, { CardHeader, CardTitle, CardDescription } from '../ui/Card'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div style={{ borderRadius: '12px', padding: '10px 14px', fontSize: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.payload.cor }} />
        <span style={{ color: 'var(--text-secondary)' }}>{item.name}: <strong style={{ color: 'var(--text-heading)' }}>{item.value}</strong></span>
      </div>
    </div>
  )
}

export default function PizzaChart({ dados = [] }) {
  const total = dados.reduce((a, d) => a + d.valor, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuicao de Status</CardTitle>
        <CardDescription>Proporcao no periodo</CardDescription>
      </CardHeader>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dados} dataKey="valor" nameKey="nome" cx="50%" cy="50%"
                outerRadius={72} innerRadius={50} strokeWidth={3} stroke="var(--bg-card)">
                {dados.map((e, i) => <Cell key={i} fill={e.cor} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-heading)' }}>{total}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {dados.map((item) => {
            const pct = total > 0 ? ((item.valor / total) * 100).toFixed(1) : 0
            return (
              <div key={item.nome} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, backgroundColor: item.cor }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-body)' }}>{item.nome}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '999px', backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-light)' }}>
                    <div style={{ height: '100%', borderRadius: '999px', width: `${pct}%`, backgroundColor: item.cor, transition: 'width 500ms' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
