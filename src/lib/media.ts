import {
  DeviceId,
  StreamIdx,
  VideoConfig,
  VideoIdx,
} from './model'

import {
  deviceMap,
  mediaDevices,
  videoIdxMap,
} from './config'

import {
  getMediaDeviceByIdx,
} from './device'



export function switchVideo(videoIdx: VideoIdx, video: HTMLVideoElement): Promise<VideoIdx> {
  const device = getMediaDeviceByIdx(videoIdx)

  if (!device) {
    return Promise.reject('getDeivceByIdx empty')
  }
  const { deviceId, label } = device
  const vOpts = <MediaTrackConstraints> {
    width: {
      ideal: 400,
    },
    height: {
      ideal: 300,
    },
    deviceId: { exact: deviceId },
  }

  return mediaDevices.getUserMedia({
    audio: false,
    video: vOpts,
  })
    .then(stream => {
      if (stream && video) {
        return attachStream(videoIdx, stream, video)
      }
      else {
        return Promise.reject('vedio or stream blank during switch camera')
      }
    })
    .then(() => {
      return videoIdx
    })
}

function attachStream(videoIdx: VideoIdx, stream: MediaStream, video: HTMLVideoElement): Promise<void> {
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
