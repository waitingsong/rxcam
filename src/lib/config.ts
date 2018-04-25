import {
  DeviceId,
  VideoIdx,
} from './model'

export let mediaDevices: MediaDevices

// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  mediaDevices = navigator.mediaDevices
}
else {
  throw new Error('mediaDevices.getUserMedia not support')
}

export const deviceMap = new Map<DeviceId, MediaDeviceInfo>()
export const videoIdxMap = new Map<VideoIdx, DeviceId>()
