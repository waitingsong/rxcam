import {
  deviceMap,
  mediaDevices,
  videoIdxMap,
} from './config'
import {
  DeviceId,
  VideoConfig,
  VideoIdx,
} from './model'


export function invokePermission(): Promise<void> {
  let time: any

  return Promise.race([
    new Promise<void>((resolve, reject) => {
      time = setTimeout(() => {
        reject('findDevice timeout')
      }, 30000) // @HARDCODED
    }),

    mediaDevices.getUserMedia({
      audio: false,
      video: true,
    }),
  ])
    .then(() => {
      clearTimeout(time)
    })
    .catch(err => {
      clearTimeout(time)
      throw err
    })
}


export function findDevices() {
  return mediaDevices.enumerateDevices()
    .then((devicesInfo: MediaDeviceInfo[]) => {
      for (const dev of devicesInfo) {
        if (dev.deviceId) {
          if (dev.kind === 'videoinput' || dev.kind === 'audioinput') {
            deviceMap.set(dev.deviceId, dev)
          }
          if (dev.kind === 'videoinput') {
            const size = videoIdxMap.size

            videoIdxMap.set(size, dev.deviceId)
          }
        }
      }
    })
}


// get a MediaStream
export function getMediaDeviceByDeviceId(deviceId: DeviceId) {
  return deviceMap.get(deviceId)
}

export function getMediaDeviceByIdx(videoIdx: VideoIdx): MediaDeviceInfo | void {
  const deviceId = videoIdxMap.get(videoIdx)

  if (deviceId) {
    return getMediaDeviceByDeviceId(deviceId)
  }
}

// validate camera available
export function isVideoAvailable(videoIdx: VideoIdx) {
  return videoIdxMap.has(videoIdx)
}

// get next available mediadevice video index
export function getNextVideoIdx(curVideoIdx: VideoIdx): VideoIdx | void {
  const nextIdx = curVideoIdx + 1

  if (isVideoAvailable(nextIdx)) {
    return nextIdx
  }
  const ids = [...videoIdxMap.keys()]

  if (ids.length === 1) {
    return
  }
  ids.push(ids[0])

  return ids[ids.indexOf(curVideoIdx) + 1]
}
