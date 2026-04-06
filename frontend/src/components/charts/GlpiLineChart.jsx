/**
 * GlpiLineChart — Tendencia de chamados GLPI — 100% CSS inline
 */
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
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

export default function GlpiLineChart({ dados = [], limite = 50 }) {
  return (
    <Card>
      <CardHeader>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <CardTitle>GLPI — Tendencia de Chamados</CardTitle>
            <CardDescription>Volume de chamados ao longo do tempo</CardDescription>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--blue)',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Chamados</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '16px',
                  height: '2px',
                  backgroundColor: 'var(--red)',
                  borderTop: '2px dashed var(--red)',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Limite ({limite})
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <div style={{ height: '280px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={dados}
            margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradientChamados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'var(--border)', strokeDasharray: '4 4' }}
            />
            <ReferenceLine
              y={limite}
              stroke="var(--red)"
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{
                value: `Limite: ${limite}`,
                position: 'insideTopRight',
                fill: 'var(--red)',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <Area
              type="monotone"
              dataKey="quantidade"
              name="Chamados"
              stroke="var(--blue)"
              strokeWidth={2}
              fill="url(#gradientChamados)"
              dot={false}
              activeDot={{
                r: 5,
                stroke: 'var(--blue)',
                strokeWidth: 2,
                fill: 'var(--bg-card)',
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
