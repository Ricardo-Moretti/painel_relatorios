import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import useToastStore from '../../stores/toastStore'

const icons = {
  success: { Ic: CheckCircle2, cor: 'var(--green)', bg: 'var(--green-subtle)', border: 'var(--green-border)' },
  error: { Ic: XCircle, cor: 'var(--red)', bg: 'var(--red-subtle)', border: 'var(--red-border)' },
  warning: { Ic: AlertTriangle, cor: 'var(--amber)', bg: 'var(--amber-subtle)', border: 'var(--amber-border)' },
  info: { Ic: Info, cor: 'var(--blue)', bg: 'var(--blue-subtle)', border: 'var(--blue-border)' },
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()
  if (!toasts.length) return null

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '380px', width: '100%', pointerEvents: 'none' }}>
      {toasts.map((t) => {
        const { Ic, cor, bg, border } = icons[t.tipo] || icons.info
        return (
          <div key={t.id} className="animate-fade-up" style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
            borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: `1px solid ${border}`,
            boxShadow: 'var(--shadow-lg)', pointerEvents: 'auto',
          }}>
            <Ic style={{ width: '20px', height: '20px', flexShrink: 0, color: cor }} />
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-heading)' }}>{t.msg}</span>
            <button onClick={() => removeToast(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}>
              <X style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
