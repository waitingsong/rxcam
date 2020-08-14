import { fromEvent } from 'rxjs'

import {
  Actions,
  BaseStreamConfig,
  DeviceId,
  ImgOpts,
  RxCamEvent,
  SnapOpts,
  StreamIdx,
  VideoConfig,
} from './model'


// fix for UOS
if (typeof navigator.mediaDevices === 'undefined') {
  // @ts-expect-error
  navigator.mediaDevices = {}
}
// Some browsers partially implement mediaDevices. We can't just assign an object
// with getUserMedia as it would overwrite existing properties.
// Here, we will just add the getUserMedia property if it's missing.
if (typeof navigator.mediaDevices.getUserMedia === 'undefined') {
  navigator.mediaDevices.getUserMedia = (constraints) => {
    // First get ahold of the legacy getUserMedia, if present
    // @ts-expect-error
    const getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia

    // Some browsers just don't implement it - return a rejected promise with an error
    // to keep a consistent interface
    if (! getUserMedia) {
      return Promise.reject(new Error('getUserMedia is not implemented in this browser'))
    }

    // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
    return new Promise((resolve, reject) => {
      // @ts-expect-error
      getUserMedia.call(navigator, constraints, resolve, reject)
    })
  }
}

if (location && location.protocol && location.protocol.toLowerCase().startsWith('https')) {
  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  if (! navigator.mediaDevices || ! navigator.mediaDevices.getUserMedia) {
    throw new Error('Either navigator.mediaDevices or mediaDevices.getUserMedia undefined!')
  }
}

export const { mediaDevices } = navigator
export const deviceMap = new Map<DeviceId, MediaDeviceInfo>()
export const videoIdxMap = new Map<StreamIdx, DeviceId>()

export const initialDeviceChangDelay = 1000 // msec

export const initialVideoConfig: VideoConfig = {
  flipHoriz: false,
  fps: 30,
  width: 400,
  height: 300,
  retryRatio: 0.8,
}

export const initialDefaultStreamConfig: BaseStreamConfig = {
  width: 800,
  height: 600,
  minWidth: 640,
  minHeight: 480,
  rotate: null,
}

export const initialSnapOpts: SnapOpts = {
  dataType: 'dataURL',
  imageFormat: 'jpeg',
  flipHoriz: false,
  width: 1024,
  height: 768,
  jpegQuality: 97,
  previewSnapRetSelector: '.rxcam-snapshot-preview',
  previewSnapRetTime: 0,
  rotate: null,
  streamIdx: 0,
  snapDelay: 0,
  switchDelay: 0,
}


export const inititalThumbnailOpts: ImgOpts = {
  dataType: 'dataURL',
  width: 400,
  height: 300,
  imageFormat: 'jpeg',
  jpegQuality: 90,
}

export const initialEvent: RxCamEvent = {
  action: Actions.noneAvailable,
}

export const deviceChangeObb = fromEvent(mediaDevices, 'devichange')

export const blankImgURL = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAHoAwAALAAAAAABAAEAAAICRAEAOw=='
