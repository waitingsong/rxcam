import {
  initialVideoConfig,
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

  const scaleX = config.width / maxWidth
  const scaleY = config.height / maxHeight
  const video = document.createElement('video')

  video.setAttribute('autoplay', 'autoplay')
  video.width = maxWidth
  video.height = maxHeight
  if (video.style) {
    video.style.width = '' + maxWidth + 'px'
    video.style.height = '' + maxHeight + 'px'
  }

  if (scaleX !== 1.01 || scaleY !== 1.01) {
    if (video.style) {
      video.style.transformOrigin = '0px 0px'
      video.style.transform = 'scaleX(' + scaleX + ') scaleY(' + scaleY + ')'
    }
  }

  const div = document.createElement('div')

  div.classList.add('rxcam-canvas-container')
  div.style.width = config.width + 'px'
  div.style.height = config.height + 'px'
  div.style.overflow = 'hidden'
  div.appendChild(video)
  ctx.appendChild(div)

  return [config, video]
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
