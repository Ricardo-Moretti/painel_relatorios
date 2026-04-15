/**
 * Chat Flutuante de IA — disponível em todas as páginas
 * Pergunta sobre dados do painel em linguagem natural
 */
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react'
import { aiAPI } from '../../services/api'

export default function ChatFlutuante() {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState([
    { role: 'ai', texto: 'Olá! Posso responder perguntas sobre as rotinas, chamados GLPI, SLA e métricas do painel. Como posso ajudar?' }
  ])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const fimRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (fimRef.current) fimRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  useEffect(() => {
    if (aberto && inputRef.current) inputRef.current.focus()
  }, [aberto])

  const enviar = async () => {
    const pergunta = input.trim()
    if (!pergunta || carregando) return
    setInput('')
    setMensagens(m => [...m, { role: 'user', texto: pergunta }])
    setCarregando(true)
    try {
      const { data } = await aiAPI.chat(pergunta)
      setMensagens(m => [...m, { role: 'ai', texto: data.resposta }])
    } catch (e) {
      const msg = e.response?.status === 429
        ? 'Limite de perguntas atingido. Aguarde um momento.'
        : 'Não consegui responder agora. Tente novamente.'
      setMensagens(m => [...m, { role: 'ai', texto: msg, erro: true }])
    } finally {
      setCarregando(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  return (
    <>
      {/* Painel de chat */}
      {aberto && (
        <div style={{
          position: 'fixed', bottom: '80px', right: '24px', zIndex: 9998,
          width: '360px', height: '480px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px',
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(135deg, #367C2B 0%, #4aaa38 100%)',
          }}>
            <Bot style={{ width: '18px', height: '18px', color: '#fff' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>Assistente de TI</p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>Powered by OpenAI</p>
            </div>
            <button onClick={() => setAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '2px' }}>
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          </div>

          {/* Mensagens */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mensagens.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: m.role === 'user' ? '#367C2B' : 'var(--bg-inset)',
                  border: '1px solid var(--border)',
                }}>
                  {m.role === 'user'
                    ? <User style={{ width: '14px', height: '14px', color: '#fff' }} />
                    : <Bot style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
                  }
                </div>
                <div style={{
                  maxWidth: '78%', padding: '8px 12px', borderRadius: '12px',
                  fontSize: '13px', lineHeight: 1.5,
                  backgroundColor: m.role === 'user' ? '#367C2B' : 'var(--bg-inset)',
                  color: m.role === 'user' ? '#fff' : m.erro ? 'var(--red)' : 'var(--text-body)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                  borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                }}>
                  {m.texto}
                </div>
              </div>
            ))}
            {carregando && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                  <Bot style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 4px', backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-muted)', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pergunte sobre rotinas, GLPI, SLA..."
              rows={1}
              style={{
                flex: 1, resize: 'none', padding: '8px 12px',
                borderRadius: '10px', fontSize: '13px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-inset)',
                color: 'var(--text-body)',
                outline: 'none', lineHeight: 1.4,
                maxHeight: '80px', overflowY: 'auto',
              }}
            />
            <button
              onClick={enviar}
              disabled={carregando || !input.trim()}
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: carregando || !input.trim() ? 'var(--bg-inset)' : '#367C2B',
                color: carregando || !input.trim() ? 'var(--text-muted)' : '#fff',
                transition: 'all 150ms', flexShrink: 0,
              }}
            >
              {carregando ? <Loader2 style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> : <Send style={{ width: '15px', height: '15px' }} />}
            </button>
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(a => !a)}
        title="Assistente de IA"
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          width: '52px', height: '52px', borderRadius: '50%',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #367C2B 0%, #4aaa38 100%)',
          boxShadow: '0 4px 20px rgba(54,124,43,0.4)',
          transition: 'all 200ms',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {aberto ? <X style={{ width: '22px', height: '22px', color: '#fff' }} /> : <MessageCircle style={{ width: '22px', height: '22px', color: '#fff' }} />}
      </button>

      <style>{`
        @keyframes pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
