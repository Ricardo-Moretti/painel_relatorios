/**
 * GlpiEnvelhecimento — Chamados com mais de 45 dias — 100% CSS inline
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import Card, { CardHeader, CardTitle, CardDescription } from '../ui/Card'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        borderRadius: '12px',
        padding: '10px 14px',
        fontSize: '12px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-heading)' }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <div
          key={i}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: p.color,
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>
            {p.name}:{' '}
            <strong style={{ color: 'var(--text-heading)' }}>{p.value}</strong>
          </span>
        </div>
      ))}
    </div>
  )
}

export default function GlpiEnvelhecimento({ dados = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>GLPI — Envelhecimento (&gt; 45 dias)</CardTitle>
        <CardDescription>Chamados abertos com mais de 45 dias</CardDescription>
      </CardHeader>

      <div style={{ height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            barCategoryGap="25%"
          >
            <CartesianGrid vertical={false} stroke="var(--border-light)" />
            <XAxis
              dataKey="data"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'var(--bg-hover)', radius: 8 }}
            />
            <Bar
              dataKey="envelhecidos"
              name="Envelhecidos"
              fill="var(--amber)"
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
