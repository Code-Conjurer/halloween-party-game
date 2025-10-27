export function generateStatic(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pixelSize: number = 1,
  colorTint?: 'red' | 'normal'
): void {
  const scaledWidth = Math.ceil(width / pixelSize)
  const scaledHeight = Math.ceil(height / pixelSize)

  const imageData = ctx.createImageData(scaledWidth, scaledHeight)
  const buffer = new Uint32Array(imageData.data.buffer)

  for (let i = 0; i < buffer.length; i++) {
    const gray = Math.random() * 255

    if (colorTint === 'red') {
      // Reddish static: keep red channel high, reduce green and blue
      const red = gray
      const green = gray * 0.3
      const blue = gray * 0.3
      buffer[i] = (255 << 24) | (red << 16) | (green << 8) | blue
    } else {
      // Normal grayscale static
      buffer[i] = (255 << 24) | (gray << 16) | (gray << 8) | gray
    }
  }

  ctx.putImageData(imageData, 0, 0)

  if (pixelSize > 1) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(ctx.canvas, 0, 0, scaledWidth, scaledHeight, 0, 0, width, height)
  }
}
