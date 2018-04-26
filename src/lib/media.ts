import {
  mediaDevices,
} from './config'
import {
  getMediaDeviceByDeviceId, getMediaDeviceByIdx,
} from './device'
import {
  DeviceId,
  SnapOpts,
  VideoConfig,
  VideoIdx,
} from './model'
import { assertNever } from './shared'


// switch camera by deviceId
export function switchVideoByDeviceId(
  deviceId: DeviceId,
  video: HTMLVideoElement,
  vconfig: VideoConfig): Promise<void> {

  const device = getMediaDeviceByDeviceId(deviceId)

  if (!device) {
    return Promise.reject('getDeivceByIdx empty')
  }
  const vOpts = <MediaTrackConstraints> {
    width: {
      ideal: vconfig.width,
    },
    height: {
      ideal: vconfig.height,
    },
    deviceId: { exact: deviceId },
  }

  return mediaDevices.getUserMedia({
    audio: false,
    video: vOpts,
  })
    .then(stream => {
      if (stream && video) {
        return attachStream(stream, video)
      }
      else {
        return Promise.reject('vedio or stream blank during switch camera')
      }
    })
}

function attachStream(stream: MediaStream, video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (stream && video) {
      video.onloadedmetadata = ev => {
        // inst.streamMap.set(videoIdx, stream)
        // inst.currStreamIdx = videoIdx
        // inst.live = true
        resolve()
      }
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
  const cvs: HTMLCanvasElement = document.createElement('canvas')

  cvs.width = sopts.width
  cvs.height = sopts.height
  const ctx = cvs.getContext('2d')

  if (!ctx) {
    throw new Error('create ctx invalid during snapshot')
  }

  // flip canvas horizontally if desired
  if (sopts.flipHoriz) {
    ctx.translate(sopts.width, 0)
    ctx.scale(-1, 1)
  }

  debugger
  if (video) {
    ctx.drawImage(video, 0, 0, sopts.width, sopts.height)

    return new Promise<string>((resolve, reject) => {
      switch (sopts.dataType) {
        case 'dataURL':
        case 'dataurl':
          return resolve(cvs.toDataURL('image/' + sopts.imageFormat, sopts.jpegQuality / 100))

        case 'objectURL':
        case 'objecturl':
          return cvs.toBlob(blob => {
            // need call URL.revokeObjectURL(ourl) later
            resolve(blob ? URL.createObjectURL(blob) : '')
          }, 'image/' + sopts.imageFormat, sopts.jpegQuality / 100)

        default:
          assertNever(sopts.dataType)
      }
    })
  }
  else {
    throw new Error('video empty')
  }
}
