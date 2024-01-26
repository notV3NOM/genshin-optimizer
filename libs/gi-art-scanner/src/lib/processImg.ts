import type { IArtifact } from '@genshin-optimizer/gi-good'
import { clamp } from '@genshin-optimizer/util'
import type { ReactNode } from 'react'
import {
  crop,
  darkerColor,
  fileToURL,
  findHistogramRange,
  histogramAnalysis,
  histogramContAnalysis,
  imageDataToCanvas,
  lighterColor,
  urlToImageData,
} from '@genshin-optimizer/img-util'
import { equipColor, lockColor, starColor } from './consts'
import type { TextKey } from './findBestArtifact'
import { findBestArtifact } from './findBestArtifact'
import {
  parseLocation,
  parseMainStatKeys,
  parseMainStatValues,
  parseSetKeys,
  parseSlotKeys,
  parseSubstats,
} from './parse'
import { textOnlyPredictor } from './artifactPredictor'

export type Processed = {
  fileName: string
  imageURL: string
  artifact: IArtifact
  texts: Partial<Record<TextKey, ReactNode>>
  debugImgs?: Record<string, string> | undefined
}
export type Outstanding = {
  f: File
  fName: string
}

export async function processEntry(
  entry: Outstanding,
  textsFromImage: (
    imageData: ImageData,
    options?: object | undefined
  ) => Promise<string[]>,
  debug = true
): Promise<Processed> {
  const { f, fName } = entry
  const imageURL = await fileToURL(f)
  const imageData = await urlToImageData(imageURL)

  const textPredictorResults = await textOnlyPredictor(
    imageData,
    textsFromImage
  )

  if (debug) console.log(textPredictorResults.data)

  const equipHistogram = histogramContAnalysis(
    imageData,
    darkerColor(equipColor),
    lighterColor(equipColor),
    false
  )
  const equipped =
    equipHistogram.some((i) => i > imageData.width * 0.5) ||
    textPredictorResults.data.ArtifactLocation.some((item: string) =>
      item.toLowerCase().includes('equipped')
    )

  const lockHisto = histogramAnalysis(
    await urlToImageData(textPredictorResults.debugImgs['ArtifactLock']),
    darkerColor(lockColor),
    lighterColor(lockColor)
  )
  const locked = lockHisto.filter((v) => v > 5).length > 5

  const rarity = parseRarity(
    await urlToImageData(textPredictorResults.debugImgs['ArtifactRarity'])
  )

  const [artifact, texts] = findBestArtifact(
    new Set([rarity]),
    parseSetKeys([textPredictorResults.data.ArtifactSet[0]]),
    parseSlotKeys([
      ...textPredictorResults.data.ArtifactSlot,
      ...textPredictorResults.data.ArtifactMainStat,
      ...textPredictorResults.data.ArtifactMainStatValue,
    ]),
    parseSubstats(textPredictorResults.data.ArtifactSubstats),
    parseMainStatKeys([
      ...textPredictorResults.data.ArtifactSlot,
      ...textPredictorResults.data.ArtifactMainStat,
      ...textPredictorResults.data.ArtifactMainStatValue,
    ]),
    parseMainStatValues([
      ...textPredictorResults.data.ArtifactSlot,
      ...textPredictorResults.data.ArtifactMainStat,
      ...textPredictorResults.data.ArtifactMainStatValue,
    ]),
    equipped ? parseLocation(textPredictorResults.data.ArtifactLocation) : '',
    locked
  )

  return {
    fileName: fName,
    imageURL: imageDataToCanvas(imageData).toDataURL(),
    artifact,
    texts,
    debugImgs: textPredictorResults.debugImgs,
  }
}

function parseRarity(headerData: ImageData) {
  const hist = histogramContAnalysis(
    headerData,
    darkerColor(starColor),
    lighterColor(starColor),
    false
  )
  const [starTop, starBot] = findHistogramRange(hist, 0.3)

  const stars = crop(imageDataToCanvas(headerData), {
    y1: starTop,
    y2: starBot,
  })

  const starsHistogram = histogramContAnalysis(
    stars,
    darkerColor(starColor),
    lighterColor(starColor)
  )
  const maxThresh = Math.max(...starsHistogram) * 0.5
  let count = 0
  let onStar = false
  for (let i = 0; i < starsHistogram.length; i++) {
    if (starsHistogram[i] > maxThresh) {
      if (!onStar) {
        count++
        onStar = true
      }
    } else {
      if (onStar) {
        onStar = false
      }
    }
  }
  return clamp(count, 1, 5)
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

export function findSplitHeight(bwImageData: ImageData): number {
  const width = bwImageData.width
  const height = bwImageData.height
  const data = bwImageData.data

  let splitHeight = 0

  // Start checking after some gap from the top
  for (let y = 20; y < height; y++) {
    let whitePixelCount = 0

    for (let x = 0; x < width; x++) {
      const isWhitePixel = data[(y * width + x) * 4] === 255

      if (isWhitePixel) {
        whitePixelCount++
      }
    }

    // Check if more than 80% of the pixels in the row are white
    const whitePixelPercentage = (whitePixelCount / width) * 100
    if (whitePixelPercentage > 80) {
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
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)

  const firstPartImageData = crop(canvas, { y1: 0, y2: splitHeight })
  const secondPartImageData = crop(canvas, {
    y1: splitHeight,
    y2: imageData.height,
  })

  return [firstPartImageData, secondPartImageData]
}
