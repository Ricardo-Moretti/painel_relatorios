/**
 * Modal — Componente reutilizavel — 100% CSS inline
 */
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ aberto, onFechar, titulo, children }) {
  const overlayRef = useRef(null)
  const panelRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    if (!aberto) return
    function handleKey(e) {
      if (e.key === 'Escape') onFechar?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [aberto, onFechar])

  // Lock body scroll when open
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [aberto])

  if (!aberto) return null

  return (
    <div
      ref={overlayRef}
      className="animate-fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onFechar?.()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        ref={panelRef}
        className="animate-fade-up"
        style={{
          width: '100%',
          maxWidth: '700px',
          maxHeight: 'calc(100vh - 48px)',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-light)',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-heading)',
              letterSpacing: '-0.01em',
            }}
          >
            {titulo}
          </h2>
          <button
            onClick={onFechar}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-card)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'all 150ms ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
              e.currentTarget.style.color = 'var(--text-heading)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-card)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <X style={{ width: '16px', height: '16px' }} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
