export function generateStatic(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pixelSize: number = 1
): void {
  const scaledWidth = Math.ceil(width / pixelSize)
  const scaledHeight = Math.ceil(height / pixelSize)

  const imageData = ctx.createImageData(scaledWidth, scaledHeight)
  const buffer = new Uint32Array(imageData.data.buffer)

  for (let i = 0; i < buffer.length; i++) {
    const gray = Math.random() * 255
    buffer[i] = (255 << 24) | (gray << 16) | (gray << 8) | gray
  }

  ctx.putImageData(imageData, 0, 0)

  if (pixelSize > 1) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(ctx.canvas, 0, 0, scaledWidth, scaledHeight, 0, 0, width, height)
  }
}
