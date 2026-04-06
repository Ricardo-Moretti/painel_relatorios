import { create } from 'zustand'

const useSidebarStore = create((set) => ({
  // Mobile
  aberta: false,
  toggle: () => set((s) => ({ aberta: !s.aberta })),
  fechar: () => set({ aberta: false }),

  // Desktop
  desktopAberta: true,
  toggleDesktop: () => set((s) => ({ desktopAberta: !s.desktopAberta })),
  fecharDesktop: () => set({ desktopAberta: false }),
  abrirDesktop: () => set({ desktopAberta: true }),
}))

export default useSidebarStore
