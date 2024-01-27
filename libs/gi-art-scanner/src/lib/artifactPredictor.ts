import {
  convertToBlackAndWhite,
  crop,
  edgeDetection,
  extractBox,
  findSplitHeight,
  imageDataToCanvas,
  scaleImage,
  splitImageVertical,
} from '@genshin-optimizer/img-util'

type NewProcessed = {
  data: any
  debugImgs: Record<string, string>
}

// const artifactAspectRatio = 1.73
const artifactNameHeaderRatio = 0.19

export async function newPredictor(
  imageData: ImageData,
  textsFromImage: (
    imageData: ImageData,
    options?: object | undefined
  ) => Promise<string[]>
): Promise<NewProcessed> {
  const debugImgs = {} as Record<string, string>

  const edgeDetectedImageData = edgeDetection(
    convertToBlackAndWhite(
      new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      ),
      false,
      200
    )
  )
  const splitHeight = findSplitHeight(edgeDetectedImageData)
  const [headerCard, whiteCard] = splitImageVertical(imageData, splitHeight)
  const [ArtifactNameCard, ArtifactMainStatCard] = splitImageVertical(
    headerCard,
    artifactNameHeaderRatio * headerCard.height
  )
  const [ArtifactSubstats, ArtifactSetLocation] = splitImageVertical(
    whiteCard,
    ArtifactMainStatCard.height
  )
  const [ArtifactSet, ArtifactLocation] = splitImageVertical(
    ArtifactSetLocation,
    ArtifactSetLocation.height - ArtifactNameCard.height
  )

  debugImgs['Edge Detection'] = imageDataToCanvas(
    edgeDetectedImageData
  ).toDataURL()
  debugImgs['Header Card'] = imageDataToCanvas(headerCard).toDataURL()
  debugImgs['White Card'] = imageDataToCanvas(whiteCard).toDataURL()
  debugImgs['Artifact Name Card'] =
    imageDataToCanvas(ArtifactNameCard).toDataURL()
  debugImgs['Artifact Main Stat Card'] =
    imageDataToCanvas(ArtifactMainStatCard).toDataURL()
  debugImgs['Artifact Substats'] =
    imageDataToCanvas(ArtifactSubstats).toDataURL()
  debugImgs['Artifact Set & Location'] =
    imageDataToCanvas(ArtifactSetLocation).toDataURL()
  debugImgs['Artifact Set'] = imageDataToCanvas(ArtifactSet).toDataURL()
  debugImgs['Artifact Location'] =
    imageDataToCanvas(ArtifactLocation).toDataURL()

  // Data about each part of the Artifact
  const ArtifactDetections = [
    {
      name: 'ArtifactName',
      start: 0,
      end: 1.0,
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
      image: ArtifactNameCard,
    },
    {
      name: 'ArtifactSlot',
      start: 0,
      end: 0.2,
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
      image: ArtifactMainStatCard,
    },
    {
      name: 'ArtifactMainStat',
      start: 0.4,
      end: 0.54,
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
      image: ArtifactMainStatCard,
    },
    {
      name: 'ArtifactMainStatValue',
      start: 0.525,
      end: 0.775,
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
      image: ArtifactMainStatCard,
    },
    {
      name: 'ArtifactRarity',
      start: 0.775,
      end: 0.95,
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
      image: ArtifactMainStatCard,
    },
    {
      name: 'ArtifactLevel',
      start: 0.03,
      end: 0.275,
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
      image: ArtifactSubstats,
    },
    {
      name: 'ArtifactLock',
      start: 0.03,
      end: 0.275,
      crop: 0.8,
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
      image: ArtifactSubstats,
    },
    {
      name: 'ArtifactSubstats',
      start: 0.275,
      end: 1.0,
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
      image: ArtifactSubstats,
    },
    {
      name: 'ArtifactSet',
      start: 0,
      end: 1.0,
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
      image: ArtifactSet,
    },
    {
      name: 'ArtifactLocation',
      start: 0,
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
      image: ArtifactLocation,
    },
  ]

  // Processing Pipeline
  const imageSegments = ArtifactDetections.map((segment, index) => {
    const totalHeight = segment.image.height
    const totalWidth = segment.image.width
    const res = crop(imageDataToCanvas(segment.image), {
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

  // OCR
  const segmentTexts = await Promise.all(
    imageSegments.map(async (segment) => {
      const textArray = await segment.textPromise
      const cleanedTextArray = textArray.map((text) => {
        return text.replace(/\n/g, '')
      })
      return {
        name: segment.name,
        text: cleanedTextArray.length ? cleanedTextArray : [''],
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
