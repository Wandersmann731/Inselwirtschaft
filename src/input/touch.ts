import { world } from '../data'

export interface MapInputHandlers {
  /** Finger or mouse drag, as a screen-pixel delta. */
  onPan(dx: number, dy: number): void
  /** Pinch or wheel zoom: factor around a point in CSS pixels relative to the canvas. */
  onZoom(factor: number, x: number, y: number): void
  /** Short tap or click without movement. */
  onTap(x: number, y: number): void
  /** Draw mode only: a single finger or the mouse starts, continues and ends a stroke. */
  onStrokeStart?(x: number, y: number): void
  onStrokeMove?(x: number, y: number): void
  onStrokeEnd?(): void
  /** Draw mode only: a second finger came down, the stroke is dropped. */
  onStrokeCancel?(): void
}

interface Pos {
  x: number
  y: number
}

/** Pointer-event gestures for the map: drag to pan, two fingers to zoom, tap to select. */
export class MapInput {
  private canvas: HTMLCanvasElement
  private handlers: MapInputHandlers
  private pointers = new Map<number, Pos>()
  private tapStart: Pos = { x: 0, y: 0 }
  private tapStartTime = 0
  private lastPan: Pos = { x: 0, y: 0 }
  private moved = false
  /** True once a second finger touched during this gesture, so it can no longer be a tap. */
  private multiTouch = false
  /** In draw mode one finger draws a stroke instead of panning the map. */
  private drawMode = false
  private stroking = false
  private pinchDistance = 0
  private pinchCenter: Pos = { x: 0, y: 0 }

  constructor(canvas: HTMLCanvasElement, handlers: MapInputHandlers) {
    this.canvas = canvas
    this.handlers = handlers
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', this.onCancel)
    canvas.addEventListener('wheel', this.onWheel, { passive: false })
  }

  setDrawMode(on: boolean): void {
    if (on === this.drawMode) return
    this.cancelStroke()
    this.drawMode = on
  }

  destroy(): void {
    const { canvas } = this
    canvas.removeEventListener('pointerdown', this.onDown)
    canvas.removeEventListener('pointermove', this.onMove)
    canvas.removeEventListener('pointerup', this.onUp)
    canvas.removeEventListener('pointercancel', this.onCancel)
    canvas.removeEventListener('wheel', this.onWheel)
  }

  private local(event: PointerEvent | WheelEvent): Pos {
    const rect = this.canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  private onDown = (event: PointerEvent): void => {
    this.canvas.setPointerCapture(event.pointerId)
    const pos = this.local(event)
    this.pointers.set(event.pointerId, pos)
    if (this.pointers.size === 1) {
      this.tapStart = pos
      this.lastPan = pos
      this.tapStartTime = event.timeStamp
      this.moved = false
      this.multiTouch = false
      if (this.drawMode) {
        this.stroking = true
        this.handlers.onStrokeStart?.(pos.x, pos.y)
      }
    } else if (this.pointers.size === 2) {
      this.cancelStroke()
      this.multiTouch = true
      this.moved = true
      this.readPinch()
    }
  }

  private onMove = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) return
    const pos = this.local(event)
    this.pointers.set(event.pointerId, pos)

    if (this.pointers.size === 1 && this.stroking) {
      this.handlers.onStrokeMove?.(pos.x, pos.y)
    } else if (this.pointers.size === 1) {
      if (!this.moved && Math.hypot(pos.x - this.tapStart.x, pos.y - this.tapStart.y) > world.input.tapSlopPx) {
        this.moved = true
      }
      if (this.moved) {
        this.handlers.onPan(pos.x - this.lastPan.x, pos.y - this.lastPan.y)
        this.lastPan = pos
      }
    } else if (this.pointers.size === 2) {
      const previous = { distance: this.pinchDistance, center: this.pinchCenter }
      this.readPinch()
      if (previous.distance > 0 && this.pinchDistance > 0) {
        this.handlers.onZoom(this.pinchDistance / previous.distance, this.pinchCenter.x, this.pinchCenter.y)
      }
      this.handlers.onPan(this.pinchCenter.x - previous.center.x, this.pinchCenter.y - previous.center.y)
    }
  }

  private onUp = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) return
    const wasSingle = this.pointers.size === 1
    this.pointers.delete(event.pointerId)
    this.releaseCapture(event.pointerId)
    if (this.stroking) {
      this.stroking = false
      this.handlers.onStrokeEnd?.()
      this.afterPointerRemoved()
      return
    }
    if (wasSingle && !this.drawMode && !this.moved && !this.multiTouch && event.timeStamp - this.tapStartTime <= world.input.tapMaxMs) {
      this.handlers.onTap(this.tapStart.x, this.tapStart.y)
    }
    this.afterPointerRemoved()
  }

  private cancelStroke(): void {
    if (!this.stroking) return
    this.stroking = false
    this.handlers.onStrokeCancel?.()
  }

  private onCancel = (event: PointerEvent): void => {
    this.cancelStroke()
    this.pointers.delete(event.pointerId)
    this.releaseCapture(event.pointerId)
    this.afterPointerRemoved()
  }

  /** After a pinch one finger may stay down: continue as a drag without a jump. */
  private afterPointerRemoved(): void {
    if (this.pointers.size === 1) {
      this.lastPan = [...this.pointers.values()][0]
      this.moved = true
    }
  }

  private releaseCapture(pointerId: number): void {
    if (this.canvas.hasPointerCapture(pointerId)) this.canvas.releasePointerCapture(pointerId)
  }

  private readPinch(): void {
    const [a, b] = [...this.pointers.values()]
    this.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y)
    this.pinchCenter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  }

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault()
    const pos = this.local(event)
    this.handlers.onZoom(Math.exp(-event.deltaY * world.input.wheelZoomSpeed), pos.x, pos.y)
  }
}
