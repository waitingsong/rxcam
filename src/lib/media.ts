import { defer, fromEvent, merge, Observable } from 'rxjs'
import { mapTo, mergeMap, pluck, take, tap, timeout } from 'rxjs/operators'

import { assertNever } from '../../node_modules/@waiting/shared-core/dist/lib/asset'

import { inititalThumbnailOpts, mediaDevices } from './config'
import { getMediaDeviceByDeviceId, stopMediaTracks } from './device'
import {
  DeviceId,
  ImgOpts,
  SnapOpts,
} from './model'


/** Switch camera by deviceId */
export function switchVideoByDeviceId(
  deviceId: DeviceId,
  video: HTMLVideoElement,
  width: number,
  height: number,
): Observable<MediaStreamConstraints> {

  if (! getMediaDeviceByDeviceId(deviceId)) {
    throw new Error(`getMediaDeviceByDeviceId("${deviceId}") return empty`)
  }
  const vOpts = <MediaTrackConstraints> {
    width: {
      ideal: Math.floor(width),
      min: Math.floor(width * 0.9),
    },
    height: {
      ideal: Math.floor(height),
      min: Math.floor(height * 0.9),
    },
    deviceId: { exact: deviceId },
  }
  const constrains: MediaStreamConstraints = {
    audio: false,
    video: vOpts,
  }

  const ret$ = defer(() => mediaDevices.getUserMedia(constrains)).pipe(
    mergeMap(stream => {
      if (stream && video) {
        return defer(() => attachStream(stream, video)).pipe(
          mapTo(constrains),
        )
      }
      else {
        throw new Error('vedio or stream blank during switch camera')
      }
    }),
  )

  return ret$
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
  video.pause && video.pause()
  stopMediaTracks(<MediaStream> video.srcObject)
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

/** Take image thumbnail, output DataURL or ObjectURL of resampled jpeg */
export function takeThumbnail(image: string | HTMLImageElement, options?: Partial<ImgOpts>): Observable<string> {
  const opts: ImgOpts = options ? { ...inititalThumbnailOpts, ...options } : inititalThumbnailOpts
  const cvs = genCanvas(opts.width, opts.height)
  const ctx = <CanvasRenderingContext2D> cvs.getContext('2d')

  if (typeof image === 'string') {
    const img = new Image()
    const ret$ = fromEvent<Event>(img, 'load').pipe(
      pluck<Event, HTMLImageElement>('target'),
      tap(target => {
        ctx.drawImage(target, 0, 0, opts.width, opts.height)
      }),
      mergeMap(() => exportFromCanvas(cvs, opts)),
      timeout(10000),
    )
    const err$ = <Observable<never>> fromEvent<Error>(img, 'error').pipe(
      tap((err: Error) => {
        throw err
      }),
    )

    img.src = image
    return merge(ret$, err$).pipe(
      take(1),
    )
  }
  else if (typeof image === 'object' && typeof image.width === 'number') {
    ctx.drawImage(image, 0, 0, opts.width, opts.height)

    return defer(() => exportFromCanvas(cvs, opts))
  }
  else {
    throw new Error('Invalid image param')
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


/** Get image's DataURL or ObjectURL */
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
        return assertNever(options.dataType)
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

