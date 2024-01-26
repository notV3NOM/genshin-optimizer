import { clamp } from '@genshin-optimizer/util'

export function cropCanvas(
  srcCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = w
  canvas.height = h
  ctx.drawImage(srcCanvas, x, y, w, h, 0, 0, w, h)
  return canvas
}

type CropOptions = {
  x1?: number
  x2?: number
  y1?: number
  y2?: number
}
export function crop(srcCanvas: HTMLCanvasElement, options: CropOptions) {
  const width = srcCanvas.width
  const height = srcCanvas.height
  let { x1 = 0, x2 = width, y1 = 0, y2 = height } = options
  x1 = clamp(x1, 0, width)
  x2 = clamp(x2, 0, width)
  y1 = clamp(y1, 0, height)
  y2 = clamp(y2, 0, height)
  if (y1 >= y2) {
    console.warn(
      `trying to crop with y1:${y1} y2:${y2}, with src height ${height}.`
    )
    y1 = 0
    y2 = height
  }
  if (x1 >= x2) {
    console.warn(
      `trying to crop with x1:${x1} x2:${x2}, with src width ${width}.`
    )
    x1 = 0
    x2 = width
  }
  const ctx = srcCanvas.getContext('2d', { willReadFrequently: true })!
  return ctx.getImageData(x1, y1, x2 - x1, y2 - y1)
}

export const fileToURL = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = ({ target }) => resolve(target!.result as string)
    reader.readAsDataURL(file)
  })
export const urlToImageData = (urlFile: string): Promise<ImageData> =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = ({ target }) =>
      resolve(imageToImageData(target as HTMLImageElement))
    img.src = urlFile
  })

function imageToImageData(image: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  canvas.width = image.width
  canvas.height = image.height
  ctx.drawImage(image, 0, 0, image.width, image.height)
  return ctx.getImageData(0, 0, image.width, image.height)
}

export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  // create off-screen canvas element
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height

  // update canvas with new data
  canvas.getContext('2d')!.putImageData(imageData, 0, 0)
  return canvas // produces a PNG file
}

export function convertToBlackAndWhite(
  inputImageData: ImageData,
  invert = false,
  threshold = 128
): ImageData {
  const data = inputImageData.data

  for (let i = 0; i < data.length; i += 4) {
    const luminance = (data[i] + data[i + 1] + data[i + 2]) / 3
    const color = luminance > threshold !== invert ? 255 : 0
    data[i] = data[i + 1] = data[i + 2] = color
  }

  return inputImageData
}

export function scaleImage(
  inputImageData: ImageData,
  scaleFactor: number
): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(inputImageData.width * scaleFactor)
  canvas.height = Math.floor(inputImageData.height * scaleFactor)

  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(
      imageDataToCanvas(inputImageData),
      0,
      0,
      inputImageData.width,
      inputImageData.height,
      0,
      0,
      canvas.width,
      canvas.height
    )
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  } else {
    return inputImageData
  }
}

export function extractBox(
  inputImageData: ImageData,
  extractColor: 'white' | 'black',
  pad: number
): ImageData {
  const inputWidth = inputImageData.width
  const inputHeight = inputImageData.height
  const inputData = inputImageData.data

  // Find the bounding box of the specified color region
  let minX = inputWidth
  let minY = inputHeight
  let maxX = 0
  let maxY = 0

  const targetColor = extractColor === 'white' ? [255, 255, 255] : [0, 0, 0]

  for (let y = 0; y < inputHeight; y++) {
    for (let x = 0; x < inputWidth; x++) {
      const index = (y * inputWidth + x) * 4

      const isTargetColor =
        inputData[index] === targetColor[0] &&
        inputData[index + 1] === targetColor[1] &&
        inputData[index + 2] === targetColor[2]

      if (isTargetColor) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  // Expand the bounding box by the specified padding
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(inputWidth - 1, maxX + pad)
  maxY = Math.min(inputHeight - 1, maxY + pad)

  // Create a new ImageData to store the extracted color box
  const extractedWidth = Math.abs(maxX - minX + 1)
  const extractedHeight = Math.abs(maxY - minY + 1)
  const extractedImageData = new ImageData(extractedWidth, extractedHeight)

  // Copy the color box from the original ImageData to the new ImageData
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const srcIndex = (y * inputWidth + x) * 4
      const destIndex = ((y - minY) * extractedWidth + (x - minX)) * 4

      extractedImageData.data[destIndex] = inputData[srcIndex]
      extractedImageData.data[destIndex + 1] = inputData[srcIndex + 1]
      extractedImageData.data[destIndex + 2] = inputData[srcIndex + 2]
      extractedImageData.data[destIndex + 3] = inputData[srcIndex + 3]
    }
  }

  return extractedImageData
}
