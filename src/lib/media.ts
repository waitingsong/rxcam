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
  getDeviceByIdx,
} from './device'



export function switchVideo(videoIdx: VideoIdx, video: HTMLVideoElement): Promise<void> {
  const device = getDeviceByIdx(videoIdx)

  if (!device) {
    return Promise.reject('getDeivceByIdx empty')
  }
  const { deviceId, label } = device

  // const last = inst.streamMap.get(sidx)
  // if (last) {
  //   return attach_stream(inst, sidx, last)
  // }

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
}

function attachStream(videoIdx: VideoIdx, stream: MediaStream, video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (stream && video) {
      debugger
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
