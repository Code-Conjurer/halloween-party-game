import { useEffect, useRef } from 'react'
import { generateStatic } from '../utils/staticGenerator'
import styles from './StaticCanvas.module.scss'

interface StaticCanvasProps {
  pixelSize?: number
  frameRate?: number // frames per second
  colorTint?: 'red' | 'normal'
}

export function StaticCanvas({ pixelSize = 1, frameRate = 60, colorTint = 'normal' }: StaticCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas to container size
    const resizeCanvas = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Start generating static
    const frameInterval = 1000 / frameRate
    let lastFrameTime = 0
    let animationId: number

    const animate = (currentTime: number) => {
      animationId = requestAnimationFrame(animate)

      const elapsed = currentTime - lastFrameTime

      if (elapsed >= frameInterval) {
        lastFrameTime = currentTime - (elapsed % frameInterval)
        generateStatic(ctx, canvas.width, canvas.height, pixelSize, colorTint)
      }
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [pixelSize, frameRate, colorTint])

  return (
    <div ref={containerRef} className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
