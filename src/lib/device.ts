/* eslint-disable @typescript-eslint/prefer-optional-chain */
import { concat, defer, from as ofrom, EMPTY, Observable } from 'rxjs'
import { mergeMap, switchMap, tap, timeout } from 'rxjs/operators'

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


export function invokePermission(timeoutValue = 10000): Observable<never> {
  const stream$: Observable<MediaStream> = defer(() => {
    return mediaDevices.getUserMedia({
      audio: false,
      video: true,
    })
  })

  return stream$.pipe(
    switchMap((stream) => {
      stopMediaTracks(stream)
      return EMPTY
    }),
    timeout(timeoutValue),
  )
}

export function resetDeviceInfo(skipInvokePermission?: boolean): Observable<never> {
  // resetDeviceMap()
  const ret$ = skipInvokePermission
    ? findDevices()
    : concat(
      invokePermission(),
      findDevices(),
    )

  return ret$.pipe(
    tap((dev: MediaDeviceInfo) => {
      if (dev.deviceId) {
        if (isMediaDeviceExistsInMap(dev.deviceId)) {
          return
        }

        if (dev.kind === 'videoinput' || dev.kind === 'audioinput') {
          deviceMap.set(dev.deviceId, dev)
        }
        if (dev.kind === 'videoinput') {
          const size = getVideoMediaDeviceSize()

          videoIdxMap.set(size, dev.deviceId)
        }
      }
    }),
    mergeMap(() => EMPTY),
    timeout(20000),
  )
}


export function findDevices(): Observable<MediaDeviceInfo> {
  const ret$ = defer(() => mediaDevices.enumerateDevices()).pipe(
    mergeMap(infos => ofrom(infos)),
  )
  return ret$
}


export function isMediaDeviceExistsInMap(deviceId: DeviceId): boolean {
  return deviceMap.has(deviceId)
}

// get a MediaStream
export function getMediaDeviceByDeviceId(deviceId: DeviceId): MediaDeviceInfo | undefined {
  return deviceMap.get(deviceId)
}

export function getMediaDeviceByIdx(sidx: StreamIdx): MediaDeviceInfo | undefined {
  const deviceId = videoIdxMap.get(sidx)

  if (deviceId) {
    return getMediaDeviceByDeviceId(deviceId)
  }
}

/** Validate camera available */
export function isVideoAvailable(sidx: StreamIdx): boolean {
  return videoIdxMap.has(sidx)
}

/** Get next available mediadevice video index */
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


export function parseMediaOrder(
  defaultStreamConfig: BaseStreamConfig,
  streamConfigs: StreamConfig[],
): StreamConfigMap {

  const ret = new Map() as StreamConfigMap
  const deviceIds: DeviceId[] = []
  let sidx = 0

  for (const sconfig of streamConfigs) {
    const labels = sconfig.matchLabels

    if (! labels || ! Array.isArray(labels)) {
      continue
    }
    // eslint-disable-next-line no-loop-func
    labels.forEach((label) => {
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

/** string/regex match, case insensitive */
export function searchVideoMediaDeviceIdByLabel(inputLabel: MatchLabel): DeviceId | void {
  if (! inputLabel) {
    return
  }
  let label = inputLabel

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
    const regex = new RegExp(label, 'u')

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
  return deviceId ? deviceMap.get(deviceId) as MediaDeviceInfo : null
}

export function getVideoMediaDeviceSize(): number {
  return videoIdxMap.size
}


export function resetDeviceMap(): void {
  videoIdxMap.clear()
  deviceMap.clear()
}

export function stopMediaTracks(stream: MediaStream): void {
  try {
    stream.getTracks()
      .forEach(track => track.stop())
  }
  catch (ex) {
    console.info(ex)
  }
}

