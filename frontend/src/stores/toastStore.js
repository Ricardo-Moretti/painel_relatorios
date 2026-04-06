import { create } from 'zustand'

let toastId = 0

const useToastStore = create((set) => ({
  toasts: [],
  addToast: (msg, tipo = 'info', duracao = 5000) => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, msg, tipo }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })), duracao)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

export default useToastStore
