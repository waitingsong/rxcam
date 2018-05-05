import {
  inititalThumbnailOpts, mediaDevices,
} from './config'
import {
  getMediaDeviceByDeviceId,
} from './device'
import {
  DeviceId,
  ImgOpts,
  SnapOpts,
} from './model'
import { assertNever } from './shared'


// switch camera by deviceId
export function switchVideoByDeviceId(
  deviceId: DeviceId,
  video: HTMLVideoElement,
  width: number,
  height: number): Promise<MediaStreamConstraints> {

  if (! getMediaDeviceByDeviceId(deviceId)) {
    return Promise.reject(`getMediaDeviceByDeviceId("${deviceId}") return empty`)
  }
  const vOpts = <MediaTrackConstraints> {
    width: {
      ideal: width,
      min: width * 0.8,
    },
    height: {
      ideal: height,
      min: height * 0.8,
    },
    deviceId: { exact: deviceId },
  }
  const constrains: MediaStreamConstraints = {
    audio: false,
    video: vOpts,
  }

  return mediaDevices.getUserMedia(constrains)
    .then(stream => {
      if (stream && video) {
        return attachStream(stream, video)
          .then(() => constrains)
      }
      else {
        return Promise.reject('vedio or stream blank during switch camera')
      }
    })
}

function attachStream(stream: MediaStream, video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (stream && video) {
      video.onloadeddata = ev => resolve()
      video.srcObject = stream
    }
    else {
      reject('attach_stream() params inst or stream invalid')
    }
  })
}

export function unattachStream(video: HTMLVideoElement) {
  video.srcObject = null
}

export function takePhoto(video: HTMLVideoElement, sopts: SnapOpts): Promise<string> {
  const cvs = genCanvas(sopts.width, sopts.height)
  const ctx = <CanvasRenderingContext2D> cvs.getContext('2d')

  // flip canvas horizontally if desired
  if (sopts.flipHoriz) {
    ctx.translate(sopts.width, 0)
    ctx.scale(-1, 1)
  }

  if (video) {
    const cvs2 = document.createElement('canvas')
    const { w, h, angular } = calcRotationParams(cvs.width, cvs.height, sopts.rotate)

    ctx.drawImage(video, 0, 0, sopts.width, sopts.height)
    if (angular !== 0) {
      cvs2.width = w
      cvs2.height = h

      drawRotated(cvs2, cvs, angular)    // rotate image
      cvs.width = cvs.height = 0

      return exportFromCanvas(cvs2, sopts)
    }

    return exportFromCanvas(cvs, sopts)
  }
  else {
    throw new Error('video empty')
  }
}

// take image thumbnail, output format jpeg
export function takeThumbnail(image: string | HTMLImageElement, options?: Partial<ImgOpts>): Promise<string> {
  const opts: ImgOpts = options ? { ...inititalThumbnailOpts, ...options } : inititalThumbnailOpts
  const cvs = genCanvas(opts.width, opts.height)
  const ctx = <CanvasRenderingContext2D> cvs.getContext('2d')

  if (typeof image === 'string') {
    const img = document.createElement('img')

    return new Promise((resolve, reject) => {
      img.src = image
      img.onload = ev => {
        ctx.drawImage(<HTMLImageElement> ev.target, 0, 0, opts.width, opts.height)

        return exportFromCanvas(cvs, opts)
          .then(resolve)
          .catch(reject)
      }
      img.onerror = err => reject(err)
    })
  }
  else if (typeof image === 'object' && typeof image.width !== 'undefined') {
    ctx.drawImage(<HTMLImageElement> image, 0, 0, opts.width, opts.height)

    return exportFromCanvas(cvs, opts)
  }
  else {
    return Promise.reject('invalid image param')
  }
}

export function genCanvas(width: number, height: number): HTMLCanvasElement {
  const cvs: HTMLCanvasElement = document.createElement('canvas')

  cvs.width = width
  cvs.height = height
  const ctx = cvs.getContext('2d')

  if (!ctx) {
    throw new Error('create ctx invalid during snapshot')
  }

  return cvs
}

export function exportFromCanvas(cvs: HTMLCanvasElement, options: ImgOpts): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    switch (options.dataType) {
      case 'dataURL':
      case 'dataurl':
        return resolve(cvs.toDataURL('image/' + options.imageFormat, options.jpegQuality / 100))

      case 'objectURL':
      case 'objecturl':
        return cvs.toBlob(blob => {
          // need call URL.revokeObjectURL(ourl) later
          resolve(blob ? URL.createObjectURL(blob) : '')
        }, 'image/' + options.imageFormat, options.jpegQuality / 100)

      default:
        assertNever(options.dataType)
    }
  })
}


function drawRotated(cvs: HTMLCanvasElement, image: HTMLCanvasElement | HTMLImageElement, degrees: number): void {
  const ctx = cvs.getContext('2d')

  if (!ctx) {
    throw new Error('canvas context invalud')
  }

  ctx.clearRect(0, 0, cvs.width, cvs.height)

  // save the unrotated context of the canvas so we can restore it later
  // the alternative is to untranslate & unrotate after drawing
  ctx.save()

  // move to the center of the canvas
  ctx.translate(cvs.width / 2, cvs.height / 2)

  // rotate the canvas to the specified degrees
  ctx.rotate(degrees * Math.PI / 180)

  // draw the image
  // since the context is rotated, the image will be rotated also
  ctx.drawImage(image, -image.width / 2, -image.height / 2)

  // we’re done with the rotating so restore the unrotated context
  ctx.restore()
}

export function calcRotationParams(width: number, height: number, rotate: number) {
  let w = +width
  let h = +height
  let angular = rotate % 360

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

// calclate image resize width/height
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
