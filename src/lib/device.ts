import {
  deviceMap,
  mediaDevices,
  videoIdxMap,
} from './config'
import {
  DeviceId,
  DeviceLabel,
  DeviceLabelOrder,
  VideoConfig,
  VideoIdx,
} from './model'
import { assertNever } from './shared'


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
      } // for END
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

// parse deivceId Array matched by value of deviceOrderByLabe
export function parseDeviceIdOrder(deviceLabelOrder: DeviceLabelOrder): DeviceId[] {
  const ret: DeviceId[] = []

  if (! deviceLabelOrder || ! Array.isArray(deviceLabelOrder) || ! deviceLabelOrder.length) {
    return ret
  }
  for (const label of deviceLabelOrder) {
    const id = searchMediaDeviceIdByLabel(label)

    id && ret.push(id)
  }

  if (ret.length >= videoIdxMap.size) {
    return ret
  }
  for (const [, deviceId] of videoIdxMap) {
    if (! ret.includes(deviceId)) {
      ret.push(deviceId)
    }
  }

  return ret
}

// string/regex match, case insensitive
export function searchMediaDeviceIdByLabel(label: DeviceLabel): DeviceId | void {
  if (!label) {
    return
  }

  if (typeof label === 'string') {
    label = label.trim()
    // precise match
    for (const [id, device] of deviceMap.entries()) {
      if (device.label && device.label.includes(label)) {
        return id
      }
    }
  }
  else if (typeof label === 'object') {
    // regex match
    const regex = new RegExp(label)

    for (const [id, device] of deviceMap.entries()) {
      if (device.label && regex.test(device.label)) {
        return id
      }
    }
  }
  else {
    assertNever(label)
  }
}

export function getDeviceIdxByDeviceId(deviceId: DeviceId): VideoIdx | void {
  //  export const videoIdxMap = new Map<VideoIdx, DeviceId>()
  for (const [videoIdx, devId] of videoIdxMap) {
    if (devId === deviceId) {
      return videoIdx
    }
  }
}
