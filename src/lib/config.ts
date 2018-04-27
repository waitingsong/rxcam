import {
  DeviceId,
  ImgOpts,
  SnapOpts,
  StreamIdx,
  VideoConfig,
} from './model'


// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
if (! navigator.mediaDevices || ! navigator.mediaDevices.getUserMedia) {
  throw new Error('mediaDevices.getUserMedia not support')
}

export const mediaDevices: MediaDevices = navigator.mediaDevices
export const deviceMap = new Map<DeviceId, MediaDeviceInfo>()
export const videoIdxMap = new Map<StreamIdx, DeviceId>()

export const initialVideoConfig: VideoConfig = {
  flipHoriz: false,
  fps: 30,
  width: 400,
  height: 300,
  deviceLabelOrder: [],
  previewWidth: 0,
  previewHeight: 0,
}

export const initialSnapOpts: SnapOpts = {
  dataType: 'dataURL',
  imageFormat: 'jpeg',
  flipHoriz: false,
  width: 600,
  height: 400,
  jpegQuality: 97,
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
