import { assertNever } from '@waiting/shared-core'
import { defer, fromEvent, merge, Observable } from 'rxjs'
import { mergeMap, pluck, take, tap, timeout } from 'rxjs/operators'


import { inititalThumbnailOpts } from './config'
import { calcRotationParams } from './helper'
import {
  ImgOpts,
  SnapOpts,
} from './model'


export function takePhoto(video: HTMLVideoElement, sopts: SnapOpts): Promise<string> {
  const cvs = genCanvas(sopts.width, sopts.height)
  const ctx = cvs.getContext('2d') as CanvasRenderingContext2D

  // flip canvas horizontally if desired
  if (sopts.flipHoriz) {
    ctx.translate(sopts.width, 0)
    ctx.scale(-1, 1)
  }

  const cvs2 = document.createElement('canvas')
  // eslint-disable-next-line id-length
  const { w, h, angular } = calcRotationParams(cvs.width, cvs.height, sopts.rotate)

  ctx.drawImage(video, 0, 0, sopts.width, sopts.height)
  if (angular !== 0) {
    cvs2.width = w
    cvs2.height = h

    drawRotated(cvs2, cvs, angular) // rotate image
    cvs.width = 0
    cvs.height = 0

    return exportFromCanvas(cvs2, sopts)
  }

  return exportFromCanvas(cvs, sopts)
}


/** Take image thumbnail, output DataURL or ObjectURL of resampled jpeg */
export function takeThumbnail(
  image: string | HTMLImageElement,
  options?: Partial<ImgOpts>,
): Observable<string> {

  const opts: ImgOpts = options ? { ...inititalThumbnailOpts, ...options } : inititalThumbnailOpts
  const cvs = genCanvas(opts.width, opts.height)
  const ctx = cvs.getContext('2d') as CanvasRenderingContext2D

  if (typeof image === 'string') {
    const img = new Image()
    const ret$ = fromEvent<Event>(img, 'load').pipe(
      pluck<Event, HTMLImageElement>('target'),
      tap((target) => {
        ctx.drawImage(target, 0, 0, opts.width, opts.height)
      }),
      mergeMap(() => exportFromCanvas(cvs, opts)),
      timeout(10000),
    )
    const err$ = fromEvent<Error>(img, 'error').pipe(
      tap((err: Error) => {
        throw err
      }),
    ) as Observable<never>

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

  if (! ctx) {
    throw new Error('create ctx invalid during snapshot')
  }

  return cvs
}


/** Get image's DataURL or ObjectURL */
export function exportFromCanvas(cvs: HTMLCanvasElement, options: ImgOpts): Promise<string> {
  return new Promise<string>((done) => {
    switch (options.dataType) {
      case 'dataURL':
      case 'dataurl':
        return done(cvs.toDataURL('image/' + options.imageFormat, options.jpegQuality / 100))

      case 'objectURL':
      case 'objecturl':
        return cvs.toBlob((blob) => {
          // need call URL.revokeObjectURL(ourl) later
          done(blob ? URL.createObjectURL(blob) : '')
        }, 'image/' + options.imageFormat, options.jpegQuality / 100)

      default:
        return assertNever(options.dataType)
    }
  })
}


function drawRotated(cvs: HTMLCanvasElement, image: HTMLCanvasElement | HTMLImageElement, degrees: number): void {
  const ctx = cvs.getContext('2d')

  if (! ctx) {
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

