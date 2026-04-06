/**
 * Barras — 100% CSS inline
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Card, { CardHeader, CardTitle, CardDescription } from '../ui/Card'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ borderRadius: '12px', padding: '10px 14px', fontSize: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
      <p style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-heading)' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}: <strong style={{ color: 'var(--text-heading)' }}>{p.value}</strong></span>
        </div>
      ))}
    </div>
  )
}

export default function BarrasChart({ dados = [] }) {
  return (
    <Card>
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <CardTitle>Performance por Rotina</CardTitle>
            <CardDescription>Comparativo de status</CardDescription>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {[{ l: 'Sucesso', c: 'var(--green)' }, { l: 'Erro', c: 'var(--red)' }, { l: 'Parcial', c: 'var(--amber)' }].map(({ l, c }) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <div style={{ height: '280px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid vertical={false} stroke="var(--border-light)" />
            <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickMargin={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)', radius: 8 }} />
            <Bar dataKey="sucesso" name="Sucesso" fill="var(--green)" radius={[6, 6, 0, 0]} maxBarSize={28} />
            <Bar dataKey="erro" name="Erro" fill="var(--red)" radius={[6, 6, 0, 0]} maxBarSize={28} />
            <Bar dataKey="parcial" name="Parcial" fill="var(--amber)" radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
