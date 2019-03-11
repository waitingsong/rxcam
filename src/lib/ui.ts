import { concat, forkJoin, interval, of, Observable } from 'rxjs'
import { delay, last, map, mapTo, shareReplay, skip, take, tap } from 'rxjs/operators'

import {
  blankImgURL, initialVideoConfig,
} from './config'
import {
  StreamConfig,
  VideoConfig,
} from './model'


export function initUI(
  ctx: HTMLElement,
  vconfig: Partial<VideoConfig>,
  maxWidth: number,
  maxHeight: number,
): [VideoConfig, HTMLVideoElement] {
  const config: VideoConfig = { ...initialVideoConfig, ...vconfig }

  if (!ctx) {
    throw new Error('ctx not a valid htmlelement')
  }
  if (! config.width || config.width < 0 || ! config.height || config.height < 0) {
    throw new Error('previewWidth or previewHeight of preview container invalie')
  }
  if (typeof config.fps !== 'number' || config.fps < 0) {
    config.fps = 30
  }

  const div = genDOMContainer(config.width, config.height)
  const video = genDOMVideo(config.width, config.height, maxWidth, maxHeight)
  const img = genDOMImg(config.width, config.height)

  div.appendChild(video)  // top
  div.appendChild(img)  // bottom
  ctx.appendChild(div)

  return [config, video]
}


function genDOMContainer(
  width: number,
  height: number,
): HTMLDivElement {
  const div = document.createElement('div')

  div.classList.add('rxcam-canvas-container')
  div.style.width = width + 'px'
  div.style.height = height + 'px'
  div.style.overflow = 'hidden'
  div.style.position = 'relative'
  return div
}


/** For preview snapshot result image */
function genDOMImg(
  width: number,
  height: number,
 ): HTMLImageElement {

  const img = document.createElement('img')

  img.classList.add('rxcam-snapshot-preview')
  // img.style.width = width + 'px'
  // img.style.height = height + 'px'
  img.style.maxWidth = width + 'px'
  img.style.maxHeight = height + 'px'
  img.style.position = 'absolute'
  img.style.opacity = '0'
  img.style.top = '0'
  img.style.left = '0'
  img.src = blankImgURL
  return img
}


function genDOMVideo(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
 ): HTMLVideoElement {

  const scaleX = width / maxWidth
  const scaleY = height / maxHeight
  const video = document.createElement('video')

  video.setAttribute('autoplay', 'autoplay')
  video.width = maxWidth
  video.height = maxHeight
  if (video.style) {
    video.style.width = maxWidth + 'px'
    video.style.height = maxHeight + 'px'
  }

  if (scaleX !== 1.01 || scaleY !== 1.01) {
    if (video.style) {
      video.style.transformOrigin = '0px 0px'
      video.style.transform = 'scaleX(' + scaleX + ') scaleY(' + scaleY + ')'
    }
  }

  return video
}

export function calcVideoMaxResolution(sconfigs: StreamConfig[]): [number, number] {
  let width = 0
  let height = 0

  for (const sconfig of sconfigs) {
    if (sconfig.width > width) {
      width = +sconfig.width
      height = +sconfig.height
    }
  }

  return [width, height]
}


export function toggleImgPreview(
  element: HTMLImageElement,
  data: string,
  video: HTMLVideoElement,
  ): Observable<null> {

  return data
    ? showImgPreivew(element, data, video)
    : resetImgPreivew(element, blankImgURL, video)
}

function showImgPreivew(
  element: HTMLImageElement,
  data: string,
  video: HTMLVideoElement,
): Observable<null> {

  const intv = 20
  const range$ = interval(intv).pipe(
    skip(1),
    take(10), // 1-10
    shareReplay(1),
  )

  const video$ = range$.pipe(
    map(val => {
      const op = 1 - val / 10
      return op > 0 ? op : 0
    }),
    tap(val => {
      video.style.opacity = `${val}`
    }),
  )

  const imgSrc$ = of(data).pipe(
    tap(url => {
      element.src = url
    }),
  )
  const imgOpacity$ = range$.pipe(
    delay(intv * 3),
    map(val => {
      const op = val / 10
      return op < 1 ? op : 1
    }),
    tap(val => {
      element.style.opacity = `${val}`
    }),
  )

  const img$ = concat(
    imgSrc$,
    imgOpacity$,
  ).pipe(
    last(),
    mapTo(null),
  )

  const ret$ = forkJoin(video$, img$).pipe(
    last(),
    mapTo(null),
  )

  return ret$
}


function resetImgPreivew(
  element: HTMLImageElement,
  data: string,
  video: HTMLVideoElement,
): Observable<null> {

  const intv = 20
  const range$ = interval(intv).pipe(
    skip(1),
    take(10), // 1-10
    shareReplay(1),
  )

  const video$ = range$.pipe(
    delay(intv * 4),
    map(val => {
      const op = val / 10
      return op < 1 ? op : 1
    }),
    tap(val => {
      video.style.opacity = `${val}`
    }),
  )

  const imgSrc$ = of(data).pipe(
    tap(url => {
      element.src = url
    }),
  )
  const imgOpacity$ = range$.pipe(
    map(val => {
      const op = 1 - val / 10
      return op > 0 ? op : 0
    }),
    tap(val => {
      element.style.opacity = `${val}`
    }),
    last(),
  )

  const img$ = concat(
    imgOpacity$,
    imgSrc$,
  ).pipe(
    last(),
    mapTo(null),
  )

  const ret$ = forkJoin(img$, video$).pipe(
    last(),
    mapTo(null),
  )

  return ret$
}
