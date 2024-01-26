import {
  convertToBlackAndWhite,
  crop,
  extractBox,
  imageDataToCanvas,
  scaleImage,
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
      threshold: 160,
      scale: false,
      scaleFactor: 1,
      extractBox: true,
      extractColor: 'black',
      padding: 10,
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
      threshold: 160,
      scale: false,
      scaleFactor: 1,
      extractBox: true,
      extractColor: 'black',
      padding: 10,
    },
    {
      name: 'ArtifactMainStat',
      start: 0.15,
      end: 0.19,
      crop: 0.5,
      ocr: true,
      invert: true,
      bw: true,
      cropRight: false,
      threshold: 128,
      scale: true,
      scaleFactor: 2,
      extractBox: true,
      extractColor: 'black',
      padding: 10,
    },
    {
      name: 'ArtifactMainStatValue',
      start: 0.19,
      end: 0.24,
      crop: 0.5,
      ocr: true,
      invert: true,
      bw: true,
      cropRight: false,
      threshold: 160,
      scale: true,
      scaleFactor: 4,
      extractBox: true,
      extractColor: 'black',
      padding: 10,
    },
    {
      name: 'ArtifactRarity',
      start: 0.237,
      end: 0.285,
      crop: 0.4,
      ocr: false,
      invert: true,
      bw: false,
      cropRight: false,
      threshold: 128,
      scale: false,
      scaleFactor: 1,
      extractBox: false,
      extractColor: 'white',
      padding: 10,
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
      threshold: 128,
      scale: true,
      scaleFactor: 2,
      extractBox: true,
      extractColor: 'white',
      padding: 0,
    },
    {
      name: 'ArtifactLock',
      start: 0.3,
      end: 0.36,
      crop: 0.75,
      ocr: false,
      invert: true,
      bw: false,
      cropRight: true,
      threshold: 128,
      scale: false,
      scaleFactor: 1,
      extractBox: false,
      extractColor: 'white',
      padding: 0,
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
      threshold: 160,
      scale: false,
      scaleFactor: 1,
      extractBox: true,
      extractColor: 'black',
      padding: 10,
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
      threshold: 160,
      scale: false,
      scaleFactor: 1,
      extractBox: true,
      extractColor: 'black',
      padding: 10,
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
      threshold: 160,
      scale: false,
      scaleFactor: 1,
      extractBox: true,
      extractColor: 'black',
      padding: 10,
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
    const bwRes = segment.bw
      ? convertToBlackAndWhite(res, segment.invert, segment.threshold)
      : res
    const extractedBoxRes = segment.extractBox
      ? extractBox(
          bwRes,
          segment.extractColor as 'white' | 'black',
          segment.padding
        )
      : bwRes
    const scaledRes = segment.scale
      ? scaleImage(extractedBoxRes, segment.scaleFactor)
      : extractedBoxRes
    debugImgs[ArtifactDetections[index].name] =
      imageDataToCanvas(scaledRes).toDataURL()
    return {
      name: segment.name,
      textPromise: segment.ocr
        ? textsFromImage(scaledRes)
        : Promise.resolve(['']),
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
