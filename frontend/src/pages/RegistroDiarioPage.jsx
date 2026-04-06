/**
 * Registro Diário — Preenchimento manual das rotinas
 * Seleciona data, preenche status + detalhes, salva tudo de uma vez
 */
import { useState, useEffect } from 'react'
import { Save, CheckCircle2, Calendar, AlertTriangle } from 'lucide-react'
import Header from '../components/layout/Header'
import { rotinasAPI } from '../services/api'
import useToastStore from '../stores/toastStore'

export default function RegistroDiarioPage() {
  const [rotinas, setRotinas] = useState([])
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [registros, setRegistros] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const addToast = useToastStore(s => s.addToast)

  useEffect(() => {
    rotinasAPI.listar().then(({ data }) => {
      const lista = data.dados || []
      setRotinas(lista)
      // Inicializar registros vazios
      const init = {}
      lista.forEach(r => {
        init[r.id] = r.nome.toUpperCase() === 'GLPI'
          ? { rotina_id: r.id, nome: r.nome, tipo: 'glpi', quantidade: '', detalhes: '' }
          : { rotina_id: r.id, nome: r.nome, tipo: 'normal', status: '', detalhes: '' }
      })
      setRegistros(init)
    }).catch(console.error)
  }, [])

  const atualizar = (id, campo, valor) => {
    setRegistros(prev => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }))
    setSalvo(false)
  }

  const salvar = async () => {
    const regs = Object.values(registros).filter(r => r.tipo === 'glpi' ? r.quantidade : r.status)
    if (!regs.length) { addToast('Preencha ao menos uma rotina', 'warning'); return }
    setSalvando(true)
    try {
      const { data: res } = await rotinasAPI.registroDiario({ data, registros: regs })
      addToast(res.mensagem || 'Salvo!', 'success')
      setSalvo(true)
    } catch (e) {
      addToast(e.response?.data?.mensagem || 'Erro ao salvar', 'error')
    } finally { setSalvando(false) }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
    backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-heading)',
    outline: 'none', transition: 'all 150ms',
  }

  const statusBtns = [
    { value: 'Sucesso', label: 'Sucesso', cor: '#16a34a', bg: 'rgba(22,163,74,0.1)', bd: 'rgba(22,163,74,0.3)' },
    { value: 'Erro', label: 'Fracasso', cor: '#fc381d', bg: 'rgba(252,56,29,0.1)', bd: 'rgba(252,56,29,0.3)' },
    { value: 'Parcial', label: 'Parcial', cor: '#f59e0b', bg: 'rgba(245,158,11,0.1)', bd: 'rgba(245,158,11,0.3)' },
  ]

  return (
    <>
      <Header titulo="Registro Diario" subtitulo="Preenchimento manual" />
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-page)' }}>
        <div className="page-content" style={{ maxWidth: '900px', margin: '0 auto' }}>

          {/* Seletor de data */}
          <div style={{
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)',
            boxShadow: '0 5px 10px rgba(241,242,250,1)', borderRadius: '14px', padding: '24px',
            marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar style={{ width: '20px', height: '20px', color: '#017efa' }} />
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>Data de Referencia</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Selecione o dia que deseja registrar</p>
              </div>
            </div>
            <input type="date" value={data} onChange={(e) => { setData(e.target.value); setSalvo(false) }}
              style={{ ...inputStyle, width: '200px', fontSize: '15px', fontWeight: 600 }} />
          </div>

          {/* Cards por rotina */}
          {rotinas.map(r => {
            const reg = registros[r.id] || {}
            const isGlpi = r.nome.toUpperCase() === 'GLPI'

            return (
              <div key={r.id} style={{
                backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)',
                boxShadow: '0 5px 10px rgba(241,242,250,1)', borderRadius: '14px', padding: '24px',
                marginBottom: '16px',
              }}>
                {/* Nome da rotina */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isGlpi ? 'rgba(1,126,250,0.1)' : 'rgba(22,163,74,0.1)',
                      border: `1px solid ${isGlpi ? 'rgba(1,126,250,0.25)' : 'rgba(22,163,74,0.25)'}`,
                    }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: isGlpi ? '#017efa' : '#16a34a' }}>
                        {r.nome.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)' }}>{r.nome}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.frequencia}</p>
                    </div>
                  </div>
                  {/* Indicador de preenchido */}
                  {(isGlpi ? reg.quantidade : reg.status) && (
                    <CheckCircle2 style={{ width: '20px', height: '20px', color: '#16a34a' }} />
                  )}
                </div>

                {isGlpi ? (
                  /* GLPI — campo numérico */
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Quantidade de chamados
                      </label>
                      <input type="number" min="0" placeholder="Ex: 55" value={reg.quantidade || ''}
                        onChange={(e) => atualizar(r.id, 'quantidade', e.target.value)}
                        style={{ ...inputStyle, fontSize: '18px', fontWeight: 700 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Detalhes (opcional)
                      </label>
                      <input type="text" placeholder="Ex: 17 com mais de 45 dias" value={reg.detalhes || ''}
                        onChange={(e) => atualizar(r.id, 'detalhes', e.target.value)}
                        style={inputStyle} />
                    </div>
                  </div>
                ) : (
                  /* Rotina normal — botões de status + detalhes */
                  <div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                      {statusBtns.map(btn => {
                        const ativo = reg.status === btn.value
                        return (
                          <button key={btn.value} onClick={() => atualizar(r.id, 'status', btn.value)}
                            style={{
                              flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                              cursor: 'pointer', transition: 'all 150ms', border: `2px solid ${ativo ? btn.cor : 'var(--border)'}`,
                              backgroundColor: ativo ? btn.bg : 'transparent', color: ativo ? btn.cor : 'var(--text-muted)',
                            }}
                            onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.borderColor = btn.bd }}
                            onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.borderColor = 'var(--border)' }}>
                            {btn.label}
                          </button>
                        )
                      })}
                    </div>
                    <input type="text" placeholder="Detalhes (opcional) — Ex: Gerou e enviou normalmente"
                      value={reg.detalhes || ''}
                      onChange={(e) => atualizar(r.id, 'detalhes', e.target.value)}
                      style={inputStyle} />
                  </div>
                )}
              </div>
            )
          })}

          {/* Botão salvar */}
          <button onClick={salvar} disabled={salvando || salvo}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px', fontSize: '16px', fontWeight: 700,
              color: '#fff', border: 'none', cursor: salvando || salvo ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              background: salvo ? '#16a34a' : 'linear-gradient(135deg, #017efa, #6342ff)',
              boxShadow: salvo ? '0 4px 12px rgba(22,163,74,0.3)' : '0 4px 12px rgba(1,126,250,0.3)',
              transition: 'all 200ms', opacity: salvando ? 0.6 : 1,
              marginTop: '8px',
            }}
            onMouseEnter={(e) => { if (!salvando && !salvo) e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            {salvando ? (
              <div className="animate-spin" style={{ width: '20px', height: '20px', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
            ) : salvo ? (
              <><CheckCircle2 style={{ width: '20px', height: '20px' }} /> Salvo com sucesso!</>
            ) : (
              <><Save style={{ width: '20px', height: '20px' }} /> Salvar Registro do Dia</>
            )}
          </button>

        </div>
      </main>
    </>
  )
}
