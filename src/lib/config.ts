import {
  DeviceId,
  SnapOpts,
  VideoConfig,
  VideoIdx,
} from './model'


// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
if (! navigator.mediaDevices || ! navigator.mediaDevices.getUserMedia) {
  throw new Error('mediaDevices.getUserMedia not support')
}

export const mediaDevices: MediaDevices = navigator.mediaDevices
export const deviceMap = new Map<DeviceId, MediaDeviceInfo>()
export const videoIdxMap = new Map<VideoIdx, DeviceId>()

export const initialVideoConfig: VideoConfig = {
  autoPlay: true,
  ctx: window.document.body,
  debug: false,
  flipHoriz: false,
  fps: 30,
  width: 400,
  height: 300,
  deviceLabelOrder: [],
  previewWidth: 0,
  previewHeight: 0,
  useDefault: false, // use default camera during labelList empty
}

export const initialSnapParams: SnapOpts = {
  dataType: 'dataURL',
  imageFormat: 'jpeg',
  flipHoriz: false,
  width: 400,
  height: 300,
  jpegQuality: 95,
  streamIdx: 0,
  snapDelay: 100,
  switchDelay: 0,
}
