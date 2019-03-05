import {
  ImgOpts, SnapOpts,
} from './model'


/** Calculate image resize width/height */
export function calcImgThumbResolution(imgWidth: number, imgHeight: number, maxPixel: number = 1600) {
  const ret: Partial<ImgOpts> = {
    width: +imgWidth,
    height: +imgHeight,
  }

  if (! maxPixel) {
    return ret
  }
  else {
    if (imgWidth <= maxPixel && imgHeight <= maxPixel) {
      return ret
    }
    const ratio = imgWidth / imgHeight

    if (ratio >= 1) {
      ret.width = maxPixel
      ret.height = maxPixel / ratio
    }
    else {
      ret.width = maxPixel * ratio
      ret.height = maxPixel
    }
  }

  return ret
}


export function calcRotationParams(
  width: SnapOpts['width'],
  height: SnapOpts['height'],
  rotate: SnapOpts['rotate'],
) {

  let w = +width
  let h = +height
  let angular = (rotate ? rotate : 0) % 360

  if (angular === 0) {
    return { w, h, angular }
  }
  if (angular < 0) {
    angular = angular + 360
  }
  const ratio = angular / 45

  if (ratio >= 1 && ratio < 3) {
    w = height
    h = width
  }
  else if (ratio >= 5 && ratio < 7) {
    w = height
    h = width
  }

  return { w, h, angular }
}
