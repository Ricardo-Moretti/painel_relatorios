/**
 * Tabela Analitica — 100% CSS inline
 */
import Card, { CardTitle, CardDescription } from '../ui/Card'
import { formatarData } from '../../lib/utils'

function StatusBadge({ status }) {
  const map = {
    'Sucesso': { bg: 'var(--green-subtle)', border: 'var(--green-border)', color: 'var(--green)' },
    'Erro': { bg: 'var(--red-subtle)', border: 'var(--red-border)', color: 'var(--red)' },
    'Parcial': { bg: 'var(--amber-subtle)', border: 'var(--amber-border)', color: 'var(--amber)' },
  }
  const s = map[status] || { bg: 'var(--bg-inset)', border: 'var(--border)', color: 'var(--text-muted)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
      backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: s.color }} />
      {status || 'Sem dados'}
    </span>
  )
}

function ScoreBar({ score }) {
  const v = parseFloat(score) || 0
  const cor = v >= 70 ? 'var(--green)' : v >= 40 ? 'var(--amber)' : 'var(--red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ flex: 1, height: '8px', borderRadius: '999px', backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-light)' }}>
        <div style={{ height: '100%', borderRadius: '999px', width: `${Math.min(v, 100)}%`, backgroundColor: cor, transition: 'width 500ms' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, width: '28px', textAlign: 'right', color: cor }}>{v.toFixed(0)}</span>
    </div>
  )
}

function Tendencia({ valor }) {
  const map = {
    melhorando: { s: '\u2191', cor: 'var(--green)', bg: 'var(--green-subtle)', border: 'var(--green-border)' },
    piorando: { s: '\u2193', cor: 'var(--red)', bg: 'var(--red-subtle)', border: 'var(--red-border)' },
    estavel: { s: '\u2192', cor: 'var(--text-muted)', bg: 'var(--bg-inset)', border: 'var(--border)' },
  }
  const { s, cor, bg, border } = map[valor] || map.estavel
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
      color: cor, backgroundColor: bg, border: `1px solid ${border}`,
    }}>
      {s} <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{valor}</span>
    </span>
  )
}

export default function TabelaAnalitica({ dados = [] }) {
  return (
    <Card noPadding>
      <div style={{ padding: '20px 24px 12px' }}>
        <CardTitle>Rotinas — Visao Analitica</CardTitle>
        <CardDescription>Status, score e tendencia por rotina</CardDescription>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-inset)', borderBottom: '1px solid var(--border)' }}>
              {['Rotina', 'Freq.', 'Status', 'Score', 'Tendencia', 'Ultima Exec.'].map((col) => (
                <th key={col} style={{ textAlign: 'left', padding: '12px 20px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((r, i) => (
              <tr key={r.id}
                style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: i % 2 === 1 ? 'var(--bg-inset)' : 'transparent', transition: 'background 100ms' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = i % 2 === 1 ? 'var(--bg-inset)' : 'transparent'}>
                <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 500, color: 'var(--text-heading)' }}>{r.nome}</td>
                <td style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--text-secondary)' }}>{r.frequencia}</td>
                <td style={{ padding: '14px 20px' }}><StatusBadge status={r.statusAtual} /></td>
                <td style={{ padding: '14px 20px', minWidth: '140px' }}><ScoreBar score={r.score} /></td>
                <td style={{ padding: '14px 20px' }}><Tendencia valor={r.tendencia} /></td>
                <td style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>{formatarData(r.ultimaExecucao)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {dados.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 16px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Nenhum dado. Importe um Excel para comecar.</p>
          </div>
        )}
      </div>
    </Card>
  )
}
