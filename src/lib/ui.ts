import {
  initialVideoConfig,
} from './config'
import {
  VideoConfig,
} from './model'


export function initUI(vconfig: Partial<VideoConfig>): [VideoConfig, HTMLVideoElement] {
  const config: VideoConfig = { ...initialVideoConfig, ...vconfig }

  if (!config.ctx) {
    throw new Error('videoConfig.ctx not a valid htmlelement')
  }
  const div = <HTMLDivElement> document.createElement('div')

  config.ctx.appendChild(div)

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
  const video = <HTMLVideoElement> document.createElement('video')

  config.autoPlay && video.setAttribute('autoplay', 'autoplay')
  video.width = config.width
  video.height = config.height
  if (video.style) {
    video.style.width = '' + config.width + 'px'
    video.style.height = '' + config.height + 'px'
  }

  if (scaleX !== 1.01 || scaleY !== 1.01) {
    if (config.ctx.style) {
      config.ctx.style.overflow = 'hidden'
    }
    if (video.style) {
      video.style.transformOrigin = '0px 0px'
      video.style.transform = 'scaleX(' + scaleX + ') scaleY(' + scaleY + ')'
    }
  }

  div.appendChild(video)

  return [config, video]
}
