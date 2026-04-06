/**
 * useNotifications — Push notifications para alertas SLA
 * Solicita permissao e verifica rotinas com erro a cada 5 minutos
 */
import { useEffect, useRef, useState } from 'react'

export default function useNotifications(rotinas = []) {
  const [notificados, setNotificados] = useState(new Set())
  const notificadosRef = useRef(notificados)
  notificadosRef.current = notificados

  // Solicitar permissao no mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Verificar rotinas com erro e notificar
  const verificar = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    if (!rotinas || rotinas.length === 0) return

    rotinas.forEach((r) => {
      if (r.statusAtual === 'Erro' && !notificadosRef.current.has(r.id)) {
        new Notification('Alerta SLA — Rotina com erro', {
          body: `${r.nome}: ${r.detalhes || 'Erro detectado'}`,
          icon: '/favicon.ico',
          tag: `rotina-erro-${r.id}`,
        })
        setNotificados((prev) => {
          const next = new Set(prev)
          next.add(r.id)
          return next
        })
      }
    })
  }

  // Verificar imediatamente quando rotinas mudam e a cada 5 minutos
  useEffect(() => {
    verificar()
    const interval = setInterval(verificar, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [rotinas])

  return { notificados }
}
