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


export function findDevices() {
  let time: any

  return Promise.race(
    [
      new Promise<void>((resolve, reject) => {
        time = setTimeout(() => {
          reject('findDevice timeout')
        }, 30000) // @HARDCODED
      }),

      enumerateDevices().then(() => {
        // if (!permission) {
        //   // invoke permission
        //   return invodePermission()
        // }

        // return invokePermission()
      }),
    ]
  )
    .then((err: void | Error) => {
      clearTimeout(time)
      throw err
    })
    .catch(err => {
      clearTimeout(time)
      // handleError(err)
      throw err
    })

}

export function enumerateDevices(): Promise<void> {
  return mediaDevices.enumerateDevices()
    .then((devicesInfo: MediaDeviceInfo[]) => {
      for (const dev of devicesInfo) {
        if (dev.deviceId) {
          if (dev.kind === 'videoinput' || dev.kind === 'audioinput') {
            deviceMap.set(dev.deviceId, dev)
          }
          if (dev.kind === 'videoinput') {
            debugger
            const size = videoIdxMap.size

            videoIdxMap.set(size, dev.deviceId)
          }
        }
      }
    })
}

export function invokePermission(): Promise<void> {
  return mediaDevices.getUserMedia({
    audio: false,
    video: true,
  })
    .then(stream => {
      return enumerateDevices()
    })
}

// get a MediaStream
export function getDeviceByDeviceId(deviceId: DeviceId) {
  return deviceMap.get(deviceId)
}

export function getDeviceByIdx(videoIdx: VideoIdx): MediaDeviceInfo | void {
  const deviceId = videoIdxMap.get(videoIdx)

  if (deviceId) {
    return getDeviceByDeviceId(deviceId)
  }
}
