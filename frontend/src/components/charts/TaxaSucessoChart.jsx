/**
 * TaxaSucessoChart — Taxa de sucesso por rotina (barras horizontais) — 100% CSS inline
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import Card, { CardHeader, CardTitle, CardDescription } from '../ui/Card'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
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
        {d.nome}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          Taxa: <strong style={{ color: 'var(--text-heading)' }}>{d.taxa_sucesso}%</strong>
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          Sucesso: <strong style={{ color: 'var(--text-heading)' }}>{d.sucesso}</strong> / {d.total}
        </span>
      </div>
    </div>
  )
}

function getBarColor(taxa) {
  if (taxa >= 90) return 'var(--green)'
  if (taxa >= 70) return 'var(--amber)'
  return 'var(--red)'
}

export default function TaxaSucessoChart({ dados = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Taxa de Sucesso por Rotina</CardTitle>
        <CardDescription>Percentual de execucoes com sucesso</CardDescription>
      </CardHeader>

      <div style={{ height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 4, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--border-light)" />
            <XAxis
              type="number"
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="nome"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              width={120}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'var(--bg-hover)', radius: 8 }}
            />
            <Bar
              dataKey="taxa_sucesso"
              name="Taxa de Sucesso"
              radius={[0, 6, 6, 0]}
              maxBarSize={22}
            >
              {dados.map((entry, idx) => (
                <Cell key={idx} fill={getBarColor(entry.taxa_sucesso)} />
              ))}
              <LabelList
                dataKey="taxa_sucesso"
                position="right"
                formatter={(v) => `${v}%`}
                style={{ fontSize: '11px', fontWeight: 600, fill: 'var(--text-heading)' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
