import { assertNever } from '../../node_modules/@waiting/shared-core/dist/lib/asset'

import {
  deviceMap,
  mediaDevices,
  videoIdxMap,
} from './config'
import {
  BaseStreamConfig,
  DeviceId,
  MatchLabel,
  StreamConfig,
  StreamConfigMap,
  StreamIdx,
} from './model'


export function invokePermission(): Promise<void> {
  let time: any

  return Promise.race([
    new Promise<void>((resolve, reject) => {
      time = setTimeout(() => {
        reject('findDevice timeout')
      }, 10000) // @HARDCODED
    }),

    mediaDevices.getUserMedia({
      audio: false,
      video: true,
    }),
  ])
    .then(stream => {
      stream && stopMediaTracks(stream)
      clearTimeout(time)
    })
    .catch(err => {
      clearTimeout(time)
      throw err
    })
}

export function resetDeviceInfo(skipInvokePermission?: boolean): Promise<void> {
  // resetDeviceMap()
  if (skipInvokePermission) {
    return findDevices()
      .catch(console.info)
  }
  return invokePermission()
    .then(findDevices)
    .catch(console.info)
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


export function parseMediaOrder(defaultStreamConfig: BaseStreamConfig, streamConfigs: StreamConfig[]): StreamConfigMap {
  const ret: StreamConfigMap = new Map()
  const deviceIds: DeviceId[] = []
  let sidx = 0

  for (const sconfig of streamConfigs) {
    const labels = sconfig.matchLabels

    if (! labels || ! Array.isArray(labels)) {
      continue
    }
    labels.forEach(label => {
      const deviceId = searchVideoMediaDeviceIdByLabel(label)

      if (deviceId) {
        ret.set(sidx, { ...sconfig, deviceId })
        deviceIds.push(deviceId)
        sidx += 1
      }
    })
  }

  if (ret.size >= getVideoMediaDeviceSize()) {
    return ret
  }
  for (const [, deviceId] of videoIdxMap) {
    if (! deviceIds.includes(deviceId)) {
      ret.set(sidx, {
        deviceId,
        width: defaultStreamConfig.width,
        height: defaultStreamConfig.height,
        minWidth: defaultStreamConfig.minWidth,
        minHeight: defaultStreamConfig.minHeight,
        rotate: defaultStreamConfig.rotate,
      })
      deviceIds.push(deviceId)
      sidx += 1
    }
  }

  return ret
}

// string/regex match, case insensitive
export function searchVideoMediaDeviceIdByLabel(label: MatchLabel): DeviceId | void {
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

export function stopMediaTracks(stream: MediaStream) {
  try {
    stream && stream.getTracks()
      .forEach(track => track.stop && track.stop())
  }
  catch (ex) {
    console.info(ex)
  }
}
