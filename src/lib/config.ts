import { Observable, Observer } from 'rxjs'
import { debounceTime, throttleTime } from 'rxjs/operators'

import {
  Actions,
  BaseStreamConfig,
  DeviceId,
  ImgOpts,
  RxCamEvent,
  SnapOpts,
  StreamIdx,
  VideoConfig,
} from './model'


// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
if (! navigator.mediaDevices || ! navigator.mediaDevices.getUserMedia) {
  throw new Error('mediaDevices.getUserMedia not support')
}

export const mediaDevices: MediaDevices = navigator.mediaDevices
export const deviceMap = new Map<DeviceId, MediaDeviceInfo>()
export const videoIdxMap = new Map<StreamIdx, DeviceId>()

export const initialVideoConfig: VideoConfig = {
  flipHoriz: false,
  fps: 30,
  width: 400,
  height: 300,
  retryRatio: 0.8,
}

export const initialDefaultStreamConfig: BaseStreamConfig = {
  width: 800,
  height: 600,
  minWidth: 640,
  minHeight: 480,
  rotate: 0,
}

export const initialSnapOpts: SnapOpts = {
  dataType: 'dataURL',
  imageFormat: 'jpeg',
  flipHoriz: false,
  width: 1024,
  height: 768,
  jpegQuality: 97,
  rotate: 0,
  streamIdx: 0,
  snapDelay: 0,
  switchDelay: 0,
}


export const inititalThumbnailOpts: ImgOpts = {
  dataType: 'dataURL',
  width: 400,
  height: 300,
  imageFormat: 'jpeg',
  jpegQuality: 90,
}

export const initialEvent: RxCamEvent = {
  action: Actions.noneAvailable,
}

export const deviceChange$: Observable<Event> = Observable.create((obv: Observer<Event>) => {
  mediaDevices.ondevicechange = ev => obv.next(ev)
})
  .pipe(throttleTime(1000))
