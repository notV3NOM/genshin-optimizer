import {
  convertToBlackAndWhite,
  edgeDetection,
  imageDataToCanvas,
} from '@genshin-optimizer/img-util'

interface Point {
  x: number
  y: number
}
interface Rectangle {
  topLeft: Point
  bottomRight: Point
}
type artifactPredictorResult = {
  artifactImageData: ImageData
  debugImgs: Record<string, string>
}

export function artifactBoxPredictor(
  imageData: ImageData
): artifactPredictorResult {
  const debugImgs = {} as Record<string, string>

  imageData = boxPredictor(convertToLandscape(imageData), debugImgs)

  return {
    artifactImageData: imageData,
    debugImgs: debugImgs,
  }
}

function boxPredictor(
  imageData: ImageData,
  debugImgs: Record<string, string>
): ImageData {
  const edgeDetectedImageData = edgeDetection(imageData)

  debugImgs['Edge Detection Full Screen'] = imageDataToCanvas(
    edgeDetectedImageData
  ).toDataURL()

  const bwEdgeData = convertToBlackAndWhite(
    new ImageData(
      new Uint8ClampedArray(edgeDetectedImageData.data),
      edgeDetectedImageData.width,
      edgeDetectedImageData.height
    )
  )

  const { topLeft, bottomRight } = findLargestRectangle(bwEdgeData)

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  const width = bottomRight.x - topLeft.x + 1
  const height = bottomRight.y - topLeft.y + 1

  canvas.width = width
  canvas.height = height

  context.drawImage(
    imageDataToCanvas(imageData),
    topLeft.x,
    topLeft.y,
    width,
    height,
    0,
    0,
    width,
    height
  )

  const largestRectangleImageData = context.getImageData(0, 0, width, height)
  debugImgs['Largest Rectangle'] = canvas.toDataURL()

  return largestRectangleImageData
}

function findLargestRectangle(imageData: ImageData): Rectangle {
  const width = imageData.width
  const height = imageData.height
  const data = imageData.data

  let maxArea = 0
  let maxRectangle: Rectangle = {
    topLeft: { x: 0, y: 0 },
    bottomRight: { x: 0, y: 0 },
  }

  function isWhite(x: number, y: number): boolean {
    const pixelIndex = (y * width + x) * 4
    return data[pixelIndex] === 255
  }

  function expandFromPoint(x: number, y: number): Rectangle {
    let left = x
    let right = x
    let top = y
    let bottom = y

    while (left > 0 && isWhite(left - 1, y)) left--
    while (right < width - 1 && isWhite(right + 1, y)) right++
    while (top > 0 && isWhite(x, top - 1)) top--
    while (bottom < height - 1 && isWhite(x, bottom + 1)) bottom++

    return {
      topLeft: { x: left, y: top },
      bottomRight: { x: right, y: bottom },
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isWhite(x, y)) {
        const rectangle = expandFromPoint(x, y)
        const area =
          (rectangle.bottomRight.x - rectangle.topLeft.x + 1) *
          (rectangle.bottomRight.y - rectangle.topLeft.y + 1)
        if (area > maxArea) {
          maxArea = area
          maxRectangle = rectangle
        }
      }
    }
  }

  return maxRectangle
}

function convertToLandscape(inputImageData: ImageData): ImageData {
  const originalWidth = inputImageData.width
  const originalHeight = inputImageData.height

  // Check if the image is already landscape
  if (originalWidth > originalHeight) {
    return inputImageData
  }

  const enlargedWidth = Math.max(originalWidth, originalHeight) + 20
  const enlargedHeight = Math.max(originalWidth, originalHeight) + 20
  const canvas = document.createElement('canvas')
  canvas.width = enlargedWidth
  canvas.height = enlargedHeight
  const ctx = canvas.getContext('2d')!

  const xPadding = Math.floor((enlargedWidth - originalWidth) / 2)
  const yPadding = Math.floor((enlargedHeight - originalHeight) / 2)

  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, enlargedWidth, enlargedHeight)

  ctx.putImageData(inputImageData, xPadding, yPadding)

  return ctx.getImageData(0, 0, enlargedWidth, enlargedHeight)
}
