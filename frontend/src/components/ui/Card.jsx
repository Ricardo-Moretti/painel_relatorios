/**
 * Card — 100% CSS inline
 */
import { cn } from '../../lib/utils'

export default function Card({ children, className, hoverable = false, noPadding = false, ...props }) {
  return (
    <div
      className={cn(className)}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-glow)',
        boxShadow: 'var(--shadow-sm), var(--glow-card)',
        borderRadius: '12px',
        padding: noPadding ? 0 : '20px 24px',
        transition: 'all 200ms ease',
      }}
      onMouseEnter={hoverable ? (e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' } : undefined}
      onMouseLeave={hoverable ? (e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' } : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children }) {
  return <div style={{ marginBottom: '20px' }}>{children}</div>
}

export function CardTitle({ children }) {
  return <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>{children}</h3>
}

export function CardDescription({ children }) {
  return <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{children}</p>
}
