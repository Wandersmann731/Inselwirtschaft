import { useEffect, useRef, useState } from 'react'
import { freeBeside, paintHarbour, releaseHarbour } from './harbourScene'

/**
 * The harbour scene behind the start menu, on a canvas that fills the screen. It is painted a moment after the menu
 * shows (until then the evening sky of the loading screen stands behind it) and again when the window changes size.
 */
export function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let timer = 0
    const paint = (): void => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        // sharp on a phone, but not larger than it needs to be
        const unit = Math.min(2, window.devicePixelRatio || 1)
        canvas.width = Math.round(canvas.clientWidth * unit)
        canvas.height = Math.round(canvas.clientHeight * unit)
        if (canvas.width === 0 || canvas.height === 0) return
        // the town belongs where the menu is not
        const panel = canvas.parentElement?.querySelector('.menu-panel')?.getBoundingClientRect()
        const free = freeBeside(canvas.clientWidth, canvas.clientHeight, panel ? { x: panel.left, y: panel.top, w: panel.width, h: panel.height } : null)
        paintHarbour(canvas, unit, { x: free.x * unit, y: free.y * unit, w: free.w * unit, h: free.h * unit })
        setShown(true)
      }, 60)
    }
    paint()
    window.addEventListener('resize', paint)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', paint)
      // the game needs its memory for its own pictures
      releaseHarbour()
    }
  }, [])

  return <canvas ref={ref} className={`menu-backdrop${shown ? ' shown' : ''}`} aria-hidden="true" />
}
