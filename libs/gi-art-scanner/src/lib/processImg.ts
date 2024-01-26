import type { IArtifact } from '@genshin-optimizer/gi-good'
import { clamp } from '@genshin-optimizer/util'
import type { ReactNode } from 'react'

import {
  crop,
  darkerColor,
  drawHistogram,
  drawline,
  fileToURL,
  findHistogramRange,
  histogramAnalysis,
  histogramContAnalysis,
  imageDataToCanvas,
  lighterColor,
  urlToImageData,
} from '@genshin-optimizer/img-util'
import {
  cardWhite,
  equipColor,
  greenTextColor,
  lockColor,
  starColor,
} from './consts'
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
  debug = false
): Promise<Processed> {
  const { f, fName } = entry
  const imageURL = await fileToURL(f)
  const imageData = await urlToImageData(imageURL)

  const textPredictorResults = await textOnlyPredictor(
    imageData,
    textsFromImage
  )

  const artifactCardImageData = verticallyCropArtifactCard(imageData)
  const artifactCardCanvas = imageDataToCanvas(artifactCardImageData)

  const whiteCardHistogram = histogramContAnalysis(
    artifactCardImageData,
    darkerColor(cardWhite),
    lighterColor(cardWhite),
    false
  )
  const [whiteCardTop, whiteCardBotOri] = findHistogramRange(
    whiteCardHistogram,
    0.8,
    2
  )
  let whiteCardBot = whiteCardBotOri

  const equipHistogram = histogramContAnalysis(
    imageData,
    darkerColor(equipColor),
    lighterColor(equipColor),
    false
  )

  const hasEquip = equipHistogram.some(
    (i) => i > artifactCardImageData.width * 0.5
  )
  const [equipBot] = findHistogramRange(equipHistogram)

  if (hasEquip) {
    whiteCardBot = equipBot
  } else {
    // try to match green text.
    // this value is not used because it can be noisy due to possible card background.

    const greentextHisto = histogramAnalysis(
      artifactCardImageData,
      darkerColor(greenTextColor),
      lighterColor(greenTextColor),
      false
    )

    const [greenTextTop, greenTextBot] = findHistogramRange(greentextHisto, 0.2)
    const greenTextBuffer = greenTextBot - greenTextTop
    if (greenTextBot > whiteCardBot)
      whiteCardBot = clamp(
        greenTextBot + greenTextBuffer,
        0,
        artifactCardImageData.height
      )
  }

  const lockHisto = histogramAnalysis(
    await urlToImageData(textPredictorResults.debugImgs['ArtifactLock']),
    darkerColor(lockColor),
    lighterColor(lockColor)
  )
  const locked = lockHisto.filter((v) => v > 5).length > 5

  const rarity = parseRarity(
    await urlToImageData(textPredictorResults.debugImgs['ArtifactRarity'])
  )

  const equipped = textPredictorResults.data.ArtifactLocation.some(
    (item: string) => item.toLowerCase().includes('equipped')
  )

  const [artifact, texts] = findBestArtifact(
    new Set([rarity]),
    parseSetKeys([textPredictorResults.data.ArtifactSet[0]]),
    parseSlotKeys([
      ...textPredictorResults.data.ArtifactSlot,
      ...textPredictorResults.data.ArtifactMainStat,
    ]),
    parseSubstats(textPredictorResults.data.ArtifactSubstats),
    parseMainStatKeys([
      ...textPredictorResults.data.ArtifactSlot,
      ...textPredictorResults.data.ArtifactMainStat,
    ]),
    parseMainStatValues([
      ...textPredictorResults.data.ArtifactSlot,
      ...textPredictorResults.data.ArtifactMainStat,
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
function verticallyCropArtifactCard(
  imageData: ImageData,
  debugImgs?: Record<string, string>
) {
  const histogram = histogramContAnalysis(
    imageData,
    darkerColor(cardWhite),
    lighterColor(cardWhite)
  )

  const [a, b] = findHistogramRange(histogram)

  const cropped = crop(imageDataToCanvas(imageData), { x1: a, x2: b })

  if (debugImgs) {
    const canvas = imageDataToCanvas(imageData)

    drawHistogram(canvas, histogram, {
      r: 255,
      g: 0,
      b: 0,
      a: 100,
    })
    drawline(canvas, a, { r: 0, g: 255, b: 0, a: 150 })
    drawline(canvas, b, { r: 0, g: 0, b: 255, a: 150 })

    debugImgs['fullAnalysis'] = canvas.toDataURL()

    // debugImgs['horicropped'] = imageDataToCanvas(cropped).toDataURL()
  }

  return cropped
}

function parseRarity(
  headerData: ImageData,
  debugImgs?: Record<string, string>
) {
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
  if (debugImgs) {
    const canvas = imageDataToCanvas(stars)
    drawHistogram(canvas, starsHistogram, { r: 100, g: 0, b: 0, a: 100 })
    debugImgs['rarity'] = canvas.toDataURL()
  }
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
