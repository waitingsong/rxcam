import {
  initialVideoConfig,
} from './config'
import {
  StreamConfig,
  VideoConfig,
} from './model'


export function initUI(ctx: HTMLElement, vconfig: Partial<VideoConfig>): [VideoConfig, HTMLVideoElement] {
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

  if (! config.previewWidth || config.previewWidth <= 0) {
    config.previewWidth = config.width
  }
  if (! config.previewHeight || config.previewHeight <= 0) {
    config.previewHeight = config.height
  }
  const scaleX = config.previewWidth / config.width
  const scaleY = config.previewHeight / config.height
  const video = document.createElement('video')

  video.setAttribute('autoplay', 'autoplay')
  video.width = config.width
  video.height = config.height
  if (video.style) {
    video.style.width = '' + config.width + 'px'
    video.style.height = '' + config.height + 'px'
  }

  if (scaleX !== 1.01 || scaleY !== 1.01) {
    if (video.style) {
      video.style.transformOrigin = '0px 0px'
      video.style.transform = 'scaleX(' + scaleX + ') scaleY(' + scaleY + ')'
    }
  }

  const div = document.createElement('div')

  div.classList.add('rxcam-canvas-container')
  div.style.width = config.previewWidth + 'px'
  div.style.height = config.previewHeight + 'px'
  div.style.overflow = 'hidden'
  div.appendChild(video)
  ctx.appendChild(div)

  return [config, video]
}

export function calcVideoMaxResolution(sconfigs: StreamConfig[]): [number, number] {
  let width = 0
  let height = 0

  for (const config of sconfigs) {
    if (config.width > width) {
      width = +config.width
      height = +config.height
    }
  }

  return [width, height]
}
