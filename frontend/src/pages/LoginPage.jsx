/**
 * Login — John Deere Theme
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import useAuthStore from '../stores/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [show, setShow] = useState(false)
  const { login, carregando, erro, limparErro } = useAuthStore()
  const navigate = useNavigate()

  const submit = async (e) => { e.preventDefault(); if (await login(email, senha)) navigate('/') }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '10px', fontSize: '14px',
    color: '#fff', backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    outline: 'none', transition: 'all 200ms'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left — Trator John Deere full */}
      <div
        className="hidden lg:flex"
        style={{
          width: '58%', position: 'relative', overflow: 'hidden',
          backgroundImage: 'url(/image_login.jpg)',
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}
      >
        {/* Overlay escuro verde JD */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(13,38,8,0.82) 0%, rgba(29,80,22,0.55) 60%, rgba(0,0,0,0.25) 100%)' }} />

        {/* Conteúdo sobre o overlay */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '56px 64px', width: '100%' }}>
          {/* Logo JD */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', backgroundColor: '#FFDE00', borderRadius: '12px', padding: '10px 18px' }}>
              <span style={{ fontSize: '22px', fontWeight: 900, color: '#1D5016', letterSpacing: '-0.5px' }}>JOHN DEERE</span>
            </div>
          </div>

          <h2 style={{ fontSize: '42px', fontWeight: 800, color: '#fff', lineHeight: 1.1, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            Painel de<br />Rotinas
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.75)', marginTop: '16px', lineHeight: 1.6, maxWidth: '380px', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
            Gestão operacional com análise de dados, alertas automáticos e visualização em tempo real.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '40px', marginTop: '40px' }}>
            {[{ n: '99.9%', l: 'Uptime' }, { n: '30d', l: 'Histórico' }, { n: 'Real-time', l: 'Alertas' }].map(({ n, l }) => (
              <div key={l}>
                <p style={{ fontSize: '20px', fontWeight: 800, color: '#FFDE00', textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>{n}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{l}</p>
              </div>
            ))}
          </div>

          {/* Crédito foto — canto inferior direito */}
          <p style={{ position: 'absolute', bottom: '16px', right: '24px', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>John Deere L-99</p>
        </div>
      </div>

      {/* Right — Formulário */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 40px', backgroundColor: '#0c1a09' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          {/* Mobile header */}
          <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#FFDE00', borderRadius: '10px', padding: '8px 16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '16px', fontWeight: 900, color: '#1D5016' }}>JOHN DEERE</span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Painel de Rotinas</h1>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Entrar</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '32px' }}>Acesse com suas credenciais</p>

          {erro && (
            <div className="animate-fade-up" style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, backgroundColor: 'rgba(239,68,68,0.10)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {erro}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); limparErro() }} placeholder="admin@painel.com" required style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input type={show ? 'text' : 'password'} value={senha} onChange={(e) => { setSenha(e.target.value); limparErro() }} placeholder="Sua senha" required style={{ ...inputStyle, paddingRight: '44px' }} />
                <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px' }}>
                  {show ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              style={{
                width: '100%', padding: '13px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                color: '#1D5016', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: carregando ? 'rgba(255,222,0,0.5)' : '#FFDE00',
                transition: 'all 200ms', letterSpacing: '0.01em',
                opacity: carregando ? 0.7 : 1,
                boxShadow: '0 4px 20px rgba(255,222,0,0.2)'
              }}
              onMouseEnter={(e) => { if (!carregando) e.currentTarget.style.background = '#e6c800' }}
              onMouseLeave={(e) => { if (!carregando) e.currentTarget.style.background = '#FFDE00' }}
            >
              {carregando
                ? <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid rgba(29,80,22,0.3)', borderTopColor: '#1D5016', borderRadius: '50%' }} />
                : <><span>Entrar</span><ArrowRight style={{ width: '16px', height: '16px' }} /></>
              }
            </button>
          </form>

          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
              Demo: <span style={{ color: 'rgba(255,255,255,0.45)' }}>admin@painel.com</span> / <span style={{ color: 'rgba(255,255,255,0.45)' }}>admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
