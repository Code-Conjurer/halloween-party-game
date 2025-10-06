import { useEffect, useRef } from 'react'
import { generateStatic } from '../utils/staticGenerator'

interface StaticCanvasProps {
  pixelSize?: number
  frameRate?: number // frames per second
}

export function StaticCanvas({ pixelSize = 1, frameRate = 60 }: StaticCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas to full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
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
        generateStatic(ctx, canvas.width, canvas.height, pixelSize)
      }
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [pixelSize, frameRate])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100vh' }} />
}
