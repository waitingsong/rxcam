import { defer, Observable } from 'rxjs'
import { mapTo, mergeMap } from 'rxjs/operators'

import { mediaDevices } from './config'
import { getMediaDeviceByDeviceId, stopMediaTracks } from './device'
import { DeviceId } from './model'


/** Switch camera by deviceId */
export function switchVideoByDeviceId(
  deviceId: DeviceId,
  video: HTMLVideoElement,
  width: number,
  height: number,
): Observable<MediaStreamConstraints> {

  if (! getMediaDeviceByDeviceId(deviceId)) {
    throw new Error(`getMediaDeviceByDeviceId("${deviceId}") return empty`)
  }
  const vOpts = {
    width: {
      ideal: Math.floor(width),
      min: Math.floor(width * 0.9),
    },
    height: {
      ideal: Math.floor(height),
      min: Math.floor(height * 0.9),
    },
    deviceId: { exact: deviceId },
  } as MediaTrackConstraints
  const constrains: MediaStreamConstraints = {
    audio: false,
    video: vOpts,
  }

  const ret$ = defer(() => mediaDevices.getUserMedia(constrains)).pipe(
    mergeMap((stream) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (stream && video) {
        return defer(() => attachStream(stream, video)).pipe(
          mapTo(constrains),
        )
      }
      else {
        throw new Error('vedio or stream blank during switch camera')
      }
    }),
  )

  return ret$
}

function attachStream(stream: MediaStream, video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (stream && video) {
      video.onloadeddata = _ => resolve()
      video.srcObject = stream
    }
    else {
      reject('attach_stream() params inst or stream invalid')
    }
  })
}

export function unattachStream(video: HTMLVideoElement): void {
  video.pause()
  stopMediaTracks(video.srcObject as MediaStream)
  video.srcObject = null
}

