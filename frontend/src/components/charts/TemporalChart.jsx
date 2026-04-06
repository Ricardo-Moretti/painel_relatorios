/**
 * Grafico Temporal — 100% CSS inline
 */
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Card, { CardHeader, CardTitle, CardDescription } from '../ui/Card'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ borderRadius: '12px', padding: '10px 14px', fontSize: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
      <p style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-heading)' }}>
        {new Date(label + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
      </p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}: <strong style={{ color: 'var(--text-heading)' }}>{p.value}</strong></span>
        </div>
      ))}
    </div>
  )
}

export default function TemporalChart({ dados = [] }) {
  return (
    <Card>
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <CardTitle>Evolucao Temporal</CardTitle>
            <CardDescription>Ultimos 30 dias</CardDescription>
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
          <AreaChart data={dados} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--green)" stopOpacity={0.15}/><stop offset="100%" stopColor="var(--green)" stopOpacity={0}/></linearGradient>
              <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--red)" stopOpacity={0.1}/><stop offset="100%" stopColor="var(--red)" stopOpacity={0}/></linearGradient>
              <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--amber)" stopOpacity={0.1}/><stop offset="100%" stopColor="var(--amber)" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border-light)" />
            <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickMargin={8}
              tickFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} interval="preserveStartEnd" />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="sucesso" name="Sucesso" stroke="var(--green)" strokeWidth={2} fill="url(#gS)" dot={false} activeDot={{ r: 4, fill: 'var(--green)', stroke: 'var(--bg-card)', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="erro" name="Erro" stroke="var(--red)" strokeWidth={2} fill="url(#gE)" dot={false} activeDot={{ r: 4, fill: 'var(--red)', stroke: 'var(--bg-card)', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="parcial" name="Parcial" stroke="var(--amber)" strokeWidth={2} fill="url(#gP)" dot={false} activeDot={{ r: 4, fill: 'var(--amber)', stroke: 'var(--bg-card)', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
