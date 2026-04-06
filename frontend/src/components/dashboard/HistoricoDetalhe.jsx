/**
 * HistoricoDetalhe — Timeline completa de uma rotina — 100% CSS inline
 */
import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { dashboardAPI } from '../../services/api'
import Modal from '../ui/Modal'

const STATUS_CONFIG = {
  sucesso: {
    color: 'var(--green)',
    subtle: 'var(--green-subtle)',
    border: 'var(--green-border)',
    icon: CheckCircle2,
    label: 'Sucesso',
  },
  erro: {
    color: 'var(--red)',
    subtle: 'var(--red-subtle)',
    border: 'var(--red-border)',
    icon: XCircle,
    label: 'Erro',
  },
  parcial: {
    color: 'var(--amber)',
    subtle: 'var(--amber-subtle)',
    border: 'var(--amber-border)',
    icon: AlertTriangle,
    label: 'Parcial',
  },
}

function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.erro
}

export default function HistoricoDetalhe({ rotinaId, rotinaNome, aberto, onFechar }) {
  const [historico, setHistorico] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!aberto || !rotinaId) return

    setCarregando(true)
    setErro(null)

    dashboardAPI
      .obterHistoricoRotina(rotinaId, 30)
      .then((res) => {
        setHistorico(res.data?.historico || res.data || [])
      })
      .catch((err) => {
        setErro(err.response?.data?.mensagem || 'Erro ao carregar historico')
      })
      .finally(() => {
        setCarregando(false)
      })
  }, [aberto, rotinaId])

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={`Historico — ${rotinaNome || 'Rotina'}`}>
      {/* Loading state */}
      {carregando && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            gap: '12px',
          }}
        >
          <Loader2
            className="animate-spin"
            style={{ width: '24px', height: '24px', color: 'var(--blue)' }}
          />
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Carregando historico...
          </span>
        </div>
      )}

      {/* Error state */}
      {!carregando && erro && (
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: 'var(--red-subtle)',
            border: '1px solid var(--red-border)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '13px', color: 'var(--red)', fontWeight: 500 }}>{erro}</p>
        </div>
      )}

      {/* Empty state */}
      {!carregando && !erro && historico.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Nenhum registro encontrado
          </p>
        </div>
      )}

      {/* Timeline */}
      {!carregando && !erro && historico.length > 0 && (
        <div style={{ position: 'relative', paddingLeft: '32px' }}>
          {/* Vertical line */}
          <div
            style={{
              position: 'absolute',
              left: '11px',
              top: '8px',
              bottom: '8px',
              width: '2px',
              backgroundColor: 'var(--border-light)',
              borderRadius: '1px',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {historico.map((item, idx) => {
              const config = getStatusConfig(item.status)
              const Icone = config.icon

              return (
                <div key={idx} style={{ position: 'relative' }}>
                  {/* Status dot */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-32px',
                      top: '2px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: config.subtle,
                      border: `2px solid ${config.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1,
                    }}
                  >
                    <Icone
                      style={{ width: '12px', height: '12px', color: config.color }}
                      strokeWidth={2.5}
                    />
                  </div>

                  {/* Content card */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-page)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = config.color
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-light)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text-heading)',
                        }}
                      >
                        {item.data}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: config.color,
                          backgroundColor: config.subtle,
                          border: `1px solid ${config.border}`,
                          padding: '2px 10px',
                          borderRadius: '20px',
                        }}
                      >
                        {config.label}
                      </span>
                    </div>

                    {item.detalhes && (
                      <p
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        {item.detalhes}
                      </p>
                    )}

                    {item.hora && (
                      <p
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          marginTop: '6px',
                          margin: 0,
                          marginTop: '6px',
                        }}
                      >
                        {item.hora}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Modal>
  )
}
