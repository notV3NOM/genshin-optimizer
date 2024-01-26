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
