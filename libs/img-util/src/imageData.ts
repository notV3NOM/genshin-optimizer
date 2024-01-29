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

  const ctx = canvas.getContext('2d')!
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

// Function to perform basic edge detection using the Sobel operator
export function edgeDetection(imageData: ImageData): ImageData {
  const width = imageData.width
  const height = imageData.height
  const data = imageData.data

  const sobelKernelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const sobelKernelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

  const resultData = new Uint8ClampedArray(data)

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sumX = 0
      let sumY = 0

      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const idx = ((y + ky - 1) * width + (x + kx - 1)) * 4
          const weightX = sobelKernelX[ky * 3 + kx]
          const weightY = sobelKernelY[ky * 3 + kx]

          sumX += data[idx] * weightX
          sumY += data[idx] * weightY
        }
      }

      const magnitude = Math.sqrt(sumX * sumX + sumY * sumY)
      const index = (y * width + x) * 4

      resultData[index] = magnitude
      resultData[index + 1] = magnitude
      resultData[index + 2] = magnitude
    }
  }

  return new ImageData(resultData, width, height)
}

export function findSplitHeight(bwImageData: ImageData, match = 80): number {
  const width = bwImageData.width
  const height = bwImageData.height
  const data = bwImageData.data
  let splitHeight = 0

  // Start checking after some gap from the top
  for (let y = 20; y < height; y++) {
    let whitePixelCount = 0
    for (let x = 0; x < width; x++) {
      const isWhitePixel = data[(y * width + x) * 4] === 255
      if (isWhitePixel) whitePixelCount++
    }
    // Check if more than match% of the pixels in the row are white
    const whitePixelPercentage = (whitePixelCount / width) * 100
    if (whitePixelPercentage > match) {
      splitHeight = y
      break
    }
  }

  return splitHeight
}

export function splitImageVertical(
  imageData: ImageData,
  splitHeight: number
): ImageData[] {
  if (splitHeight === 0) {
    return [imageData, new ImageData(imageData.width, 1)]
  }
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.putImageData(imageData, 0, 0)

  const firstPartImageData = crop(canvas, { y1: 0, y2: splitHeight })
  const secondPartImageData = crop(canvas, {
    y1: splitHeight,
    y2: imageData.height,
  })

  return [firstPartImageData, secondPartImageData]
}

export function findGreenSplitHeight(
  imageData: ImageData,
  batchSize = 5,
  threshold = 50
): number {
  const width = imageData.width
  const height = imageData.height
  const data = imageData.data
  let maxGreennessHeight = -1
  let maxGreennessValue = 0

  for (let y = 0; y < height; y += batchSize) {
    let batchGreennessCount = 0

    // Process the batch of lines
    for (
      let batchIndex = 0;
      batchIndex < batchSize && y + batchIndex < height;
      batchIndex++
    ) {
      let greennessCount = 0
      for (let x = 0; x < width; x++) {
        const index = ((y + batchIndex) * width + x) * 4
        const red = data[index]
        const green = data[index + 1]
        const blue = data[index + 2]
        const greenness = green - (red + blue) / 2
        if (greenness > threshold) {
          greennessCount++
        }
      }
      batchGreennessCount += greennessCount
    }
    // Update max greenness height if the current batch has higher greenness
    if (batchGreennessCount > maxGreennessValue) {
      maxGreennessValue = batchGreennessCount
      maxGreennessHeight = y
    }
  }

  return maxGreennessHeight
}
