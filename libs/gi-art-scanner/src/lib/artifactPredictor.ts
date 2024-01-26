import {
  convertToBlackAndWhite,
  crop,
  imageDataToCanvas,
} from '@genshin-optimizer/img-util'

type NewProcessed = {
  data: any
  debugImgs: Record<string, string>
}

export async function textOnlyPredictor(
  imageData: ImageData,
  textsFromImage: (
    imageData: ImageData,
    options?: object | undefined
  ) => Promise<string[]>
): Promise<NewProcessed> {
  const debugImgs = {} as Record<string, string>

  const ArtifactDetections = [
    {
      name: 'ArtifactName',
      start: 0,
      end: 0.061,
      crop: 1.0,
      ocr: true,
      invert: true,
      bw: true,
      cropRight: false,
    },
    {
      name: 'ArtifactSlot',
      start: 0.061,
      end: 0.1,
      crop: 0.8,
      ocr: true,
      invert: true,
      bw: true,
      cropRight: false,
    },
    {
      name: 'ArtifactMainStat',
      start: 0.15,
      end: 0.237,
      crop: 0.5,
      ocr: true,
      invert: true,
      bw: true,
      cropRight: false,
    },
    {
      name: 'ArtifactRarity',
      start: 0.237,
      end: 0.285,
      crop: 0.5,
      ocr: false,
      invert: true,
      bw: false,
      cropRight: false,
    },
    {
      name: 'ArtifactLevel',
      start: 0.3,
      end: 0.36,
      crop: 0.2,
      ocr: true,
      invert: true,
      bw: true,
      cropRight: false,
    },
    {
      name: 'ArtifactLock',
      start: 0.3,
      end: 0.36,
      crop: 0.8,
      ocr: false,
      invert: true,
      bw: false,
      cropRight: true,
    },
    {
      name: 'ArtifactSubstats',
      start: 0.36,
      end: 0.535,
      crop: 1.0,
      ocr: true,
      invert: false,
      bw: true,
      cropRight: false,
    },
    {
      name: 'ArtifactSet',
      start: 0.535,
      end: 0.93,
      crop: 1.0,
      ocr: true,
      invert: false,
      bw: true,
      cropRight: false,
    },
    {
      name: 'ArtifactLocation',
      start: 0.93,
      end: 1,
      crop: 1.0,
      ocr: true,
      invert: false,
      bw: true,
      cropRight: false,
    },
  ]

  const totalHeight = imageData.height
  const totalWidth = imageData.width

  const imageSegments = ArtifactDetections.map((segment, index) => {
    const res = crop(imageDataToCanvas(imageData), {
      x1: segment.cropRight ? Math.floor(segment.crop * totalWidth) : 0,
      x2: segment.cropRight
        ? totalWidth
        : Math.floor(segment.crop * totalWidth),
      y1: Math.floor(segment.start * totalHeight),
      y2: Math.floor(segment.end * totalHeight),
    })
    const bwRes = segment.bw ? convertToBlackAndWhite(res, segment.invert) : res
    debugImgs[ArtifactDetections[index].name] =
      imageDataToCanvas(bwRes).toDataURL()
    return {
      name: segment.name,
      textPromise: segment.ocr ? textsFromImage(bwRes) : Promise.resolve(['']),
    }
  })

  const segmentTexts = await Promise.all(
    imageSegments.map(async (segment) => {
      const textArray = await segment.textPromise
      const cleanedTextArray = textArray.map((text) => {
        return text.replace(/\n/g, '')
      })
      return {
        name: segment.name,
        text: cleanedTextArray,
      }
    })
  )

  const res: { [key: string]: string[] } = {}
  segmentTexts.forEach((segment) => {
    res[segment.name] = segment.text
  })

  return {
    data: res,
    debugImgs: debugImgs,
  }
}
