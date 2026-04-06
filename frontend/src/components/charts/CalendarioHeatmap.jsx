/**
 * Calendário Heatmap — Formato tradicional (grid mensal com números)
 * Cada dia mostra o número + cor do status
 */
import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']
const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function pad(n) { return String(n).padStart(2, '0') }

function corDia(entry) {
  if (!entry) return { bg: 'var(--bg-inset)', border: 'var(--border-light)', text: 'var(--text-muted)' }
  if (entry.erro > 0) return { bg: 'var(--red-subtle)', border: 'var(--red-border)', text: 'var(--red)' }
  if (entry.parcial > 0) return { bg: 'var(--amber-subtle)', border: 'var(--amber-border)', text: 'var(--amber)' }
  if (entry.sucesso > 0) return { bg: 'var(--green-subtle)', border: 'var(--green-border)', text: 'var(--green)' }
  return { bg: 'var(--bg-inset)', border: 'var(--border-light)', text: 'var(--text-muted)' }
}

export default function CalendarioHeatmap({ dados = [], mes, onMesChange }) {
  const [ano, mesNum] = useMemo(() => {
    const p = (mes || '').split('-')
    return [parseInt(p[0], 10), parseInt(p[1], 10)]
  }, [mes])

  const { diasGrid, lookup } = useMemo(() => {
    if (!ano || !mesNum) return { diasGrid: [], lookup: {} }

    const lookup = {}
    dados.forEach(d => { lookup[d.data] = d })

    const totalDias = new Date(ano, mesNum, 0).getDate()
    const primeiroDiaSemana = (new Date(ano, mesNum - 1, 1).getDay() + 6) % 7 // 0=Seg

    // Monta grid de 6 semanas max (42 cells)
    const grid = []
    // Dias vazios antes do dia 1
    for (let i = 0; i < primeiroDiaSemana; i++) grid.push(null)
    // Dias do mês
    for (let d = 1; d <= totalDias; d++) {
      const dateStr = `${ano}-${pad(mesNum)}-${pad(d)}`
      grid.push({ dia: d, dateStr, entry: lookup[dateStr] || null })
    }
    // Completar última semana
    while (grid.length % 7 !== 0) grid.push(null)

    return { diasGrid: grid, lookup }
  }, [ano, mesNum, dados])

  const handlePrev = () => {
    let m = mesNum - 1, a = ano
    if (m < 1) { m = 12; a-- }
    onMesChange?.(`${a}-${pad(m)}`)
  }
  const handleNext = () => {
    let m = mesNum + 1, a = ano
    if (m > 12) { m = 1; a++ }
    onMesChange?.(`${a}-${pad(m)}`)
  }

  const hoje = new Date().toISOString().split('T')[0]

  // Divide grid em semanas de 7
  const semanas = []
  for (let i = 0; i < diasGrid.length; i += 7) {
    semanas.push(diasGrid.slice(i, i + 7))
  }

  const btnNav = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '32px', height: '32px', borderRadius: '8px',
    border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)',
    cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 150ms',
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)', borderRadius: '12px', padding: '24px' }}>
      {/* Header: título + navegação */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)' }}>Calendario de Execucoes</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handlePrev} style={btnNav}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}>
            <ChevronLeft style={{ width: '16px', height: '16px' }} />
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-heading)', minWidth: '140px', textAlign: 'center' }}>
            {MESES[mesNum - 1]} {ano}
          </span>
          <button onClick={handleNext} style={btnNav}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}>
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>

      {/* Cabeçalho dias da semana */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '6px' }}>
        {DIAS_SEMANA.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      {semanas.map((semana, si) => (
        <div key={si} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '6px' }}>
          {semana.map((cell, di) => {
            if (!cell) return <div key={di} />

            const c = corDia(cell.entry)
            const isHoje = cell.dateStr === hoje
            const temDados = cell.entry && (cell.entry.sucesso > 0 || cell.entry.erro > 0 || cell.entry.parcial > 0)

            return (
              <div key={di}
                title={temDados ? `${cell.dateStr}\nSucesso: ${cell.entry.sucesso} | Erro: ${cell.entry.erro} | Parcial: ${cell.entry.parcial}` : `${cell.dateStr} — Sem dados`}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.bg,
                  border: isHoje ? '2px solid var(--blue)' : `1px solid ${c.border}`,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  minHeight: '48px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}>
                {/* Número do dia */}
                <span style={{ fontSize: '14px', fontWeight: isHoje ? 700 : 500, color: isHoje ? 'var(--blue)' : temDados ? c.text : 'var(--text-muted)' }}>
                  {cell.dia}
                </span>
                {/* Indicador de status (dots) */}
                {temDados && (
                  <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                    {cell.entry.sucesso > 0 && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--green)' }} />}
                    {cell.entry.erro > 0 && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--red)' }} />}
                    {cell.entry.parcial > 0 && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--amber)' }} />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* Legenda */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
        {[
          { label: 'Sucesso', bg: 'var(--green-subtle)', border: 'var(--green-border)', dot: 'var(--green)' },
          { label: 'Parcial', bg: 'var(--amber-subtle)', border: 'var(--amber-border)', dot: 'var(--amber)' },
          { label: 'Erro', bg: 'var(--red-subtle)', border: 'var(--red-border)', dot: 'var(--red)' },
          { label: 'Sem dados', bg: 'var(--bg-inset)', border: 'var(--border-light)', dot: 'var(--text-muted)' },
          { label: 'Hoje', bg: 'transparent', border: 'var(--blue)', dot: 'var(--blue)' },
        ].map(({ label, bg, border, dot }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: bg, border: `1.5px solid ${border}` }} />
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
