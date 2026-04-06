import { useState, useEffect } from 'react'

export default function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0 || target === null || target === undefined) { setValue(0); return }
    const num = typeof target === 'string' ? parseFloat(target) : target
    if (isNaN(num)) { setValue(target); return }
    const start = 0
    const startTime = Date.now()
    const step = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setValue(Math.round(start + (num - start) * eased))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return value
}
