/**
 * Login — 100% CSS inline
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Eye, EyeOff, ArrowRight } from 'lucide-react'
import useAuthStore from '../stores/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [show, setShow] = useState(false)
  const { login, carregando, erro, limparErro } = useAuthStore()
  const navigate = useNavigate()

  const submit = async (e) => { e.preventDefault(); if (await login(email, senha)) navigate('/') }

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', color: '#fff', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', transition: 'all 200ms' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#080a14' }}>
      {/* Left */}
      <div className="hidden lg:flex" style={{ width: '55%', position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #0f172a 0%, #1a1f3a 40%, #0f172a 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.3) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '400px', padding: '0 48px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            <Activity style={{ width: '24px', height: '24px', color: '#fff' }} strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: '36px', fontWeight: 700, color: '#fff', lineHeight: 1.15 }}>Painel de<br />Rotinas</h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '16px', lineHeight: 1.6 }}>Gestao operacional com analise de dados, alertas automaticos e visualizacao em tempo real.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginTop: '40px' }}>
            {[{ n: '99.9%', l: 'Uptime' }, { n: '30d', l: 'Historico' }, { n: 'Real-time', l: 'Alertas' }].map(({ n, l }) => (
              <div key={l}><p style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{n}</p><p style={{ fontSize: '11px', color: '#64748b' }}>{l}</p></div>
            ))}
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 40px', backgroundColor: '#0c0f1a' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', marginBottom: '16px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
              <Activity style={{ width: '24px', height: '24px', color: '#fff' }} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Painel de Rotinas</h1>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Entrar</h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px' }}>Acesse com suas credenciais</p>

          {erro && <div className="animate-fade-up" style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, backgroundColor: 'rgba(239,68,68,0.08)', color: '#f87171' }}>{erro}</div>}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '8px' }}>Email</label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); limparErro() }} placeholder="admin@painel.com" required style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '8px' }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input type={show ? 'text' : 'password'} value={senha} onChange={(e) => { setSenha(e.target.value); limparErro() }} placeholder="Sua senha" required style={{ ...inputStyle, paddingRight: '40px' }} />
                <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
                  {show ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={carregando}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', transition: 'all 200ms', opacity: carregando ? 0.5 : 1 }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = carregando ? '0.5' : '1'}>
              {carregando ? <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : <><span>Entrar</span><ArrowRight style={{ width: '16px', height: '16px' }} /></>}
            </button>
          </form>

          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '12px', color: '#475569', textAlign: 'center' }}>Demo: <span style={{ color: '#94a3b8' }}>admin@painel.com</span> / <span style={{ color: '#94a3b8' }}>admin123</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
