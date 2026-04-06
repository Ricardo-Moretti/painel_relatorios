/**
 * ExportButton — Exporta a visualizacao atual como PDF via window.print()
 */
import { FileText } from 'lucide-react'

export default function ExportButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 18px',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: 500,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        boxShadow: 'var(--shadow-xs)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 200ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'var(--shadow-xs)'
      }}
    >
      <FileText style={{ width: '16px', height: '16px' }} /> Exportar PDF
    </button>
  )
}
