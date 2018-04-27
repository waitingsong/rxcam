import {
  deviceMap,
  mediaDevices,
  videoIdxMap,
} from './config'
import {
  DeviceId,
  DeviceLabel,
  DeviceLabelOrder,
  StreamIdx,
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
          if (isMediaDeviceExistsInMap(dev.deviceId)) {
            continue
          }

          if (dev.kind === 'videoinput' || dev.kind === 'audioinput') {
            deviceMap.set(dev.deviceId, dev)
          }
          if (dev.kind === 'videoinput') {
            const size = getVideoMediaDeviceSize()

            videoIdxMap.set(size, dev.deviceId)
          }
        }
      } // for END
    })
}


export function isMediaDeviceExistsInMap(deviceId: DeviceId): boolean {
  return deviceMap.has(deviceId)
}

// get a MediaStream
export function getMediaDeviceByDeviceId(deviceId: DeviceId) {
  return deviceMap.get(deviceId)
}

export function getMediaDeviceByIdx(sidx: StreamIdx): MediaDeviceInfo | void {
  const deviceId = videoIdxMap.get(sidx)

  if (deviceId) {
    return getMediaDeviceByDeviceId(deviceId)
  }
}

// validate camera available
export function isVideoAvailable(sidx: StreamIdx) {
  return videoIdxMap.has(sidx)
}

// get next available mediadevice video index
export function getNextVideoIdx(curVideoIdx: StreamIdx): StreamIdx | void {
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

  for (const label of deviceLabelOrder) {
    const id = searchVideoMediaDeviceIdByLabel(label)

    id && ret.push(id)
  }

  if (ret.length >= getVideoMediaDeviceSize()) {
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
export function searchVideoMediaDeviceIdByLabel(label: DeviceLabel): DeviceId | void {
  if (!label) {
    return
  }

  if (typeof label === 'string') {
    label = label.trim()
    // precise match
    for (const [id, device] of deviceMap.entries()) {
      if (device.kind === 'videoinput') {
        if (device.label && device.label.includes(label)) {
          return id
        }
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

export function getDeviceIdxByDeviceId(deviceId: DeviceId): StreamIdx | void {
  for (const [sidx, devId] of videoIdxMap) {
    if (devId === deviceId) {
      return sidx
    }
  }
}

export function getMediaDeviceInfo(deviceId: DeviceId): MediaDeviceInfo | null {
  return deviceId ? <MediaDeviceInfo> deviceMap.get(deviceId) : null
}

export function getVideoMediaDeviceSize(): number {
  return videoIdxMap.size
}


export function resetDeviceMap() {
  videoIdxMap.clear()
  deviceMap.clear()
}
