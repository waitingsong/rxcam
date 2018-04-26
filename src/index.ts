import { fromEvent, Subject } from 'rxjs'
import {
  debounceTime,
  map,
  pluck,
} from 'rxjs/operators'

import { initialSnapParams } from './lib/config'
import {
  findDevices,
  getNextVideoIdx,
  invokePermission,
  parseDeviceIdOrder,
} from './lib/device'
import { switchVideoByDeviceId, takePhoto, unattachStream } from './lib/media'
import {
  DeviceId,
  DeviceLabelOrder,
  InitialOpts,
  SnapOpts,
  VideoConfig,
  VideoIdx,
} from './lib/model'
import { initUI } from './lib/ui'


// const initialStreamConfig: StreamConfig = {
//   streamIdx: 0,
//   deviceName: '',
//   deviceId: '',  // MediaTrackConstraints.deviceId
// }

export async function init(initialOpts: InitialOpts): Promise<Webcam> {
  const { config , snapOpts, deviceLabelOrder } = initialOpts
  const [vconfig, video] = initUI(config)
  const sopts: SnapOpts = { ...initialSnapParams, ...snapOpts }
  const labels = deviceLabelOrder && Array.isArray(deviceLabelOrder) ? deviceLabelOrder : []

  try {
    await invokePermission()
    await findDevices()
  }
  catch (ex) {
    console.info(ex)
  }

  return new Webcam(vconfig, sopts, video, labels)
}


export class Webcam {
  curDeviceIdx: VideoIdx
  deviceIdOrder: DeviceId[] // match by deviceOrderbyLabel

  constructor(
    public vconfig: VideoConfig,
    public snapOpts: SnapOpts,
    public video: HTMLVideoElement,
    public deviceLabelOrder: DeviceLabelOrder
  ) {
    this.curDeviceIdx = 0
    this.deviceIdOrder = parseDeviceIdOrder(deviceLabelOrder)
  }

  connect(videoIdx?: VideoIdx) {
    const vidx = videoIdx ? videoIdx : 0
    const deviceId = this.getDeviceIdFromDeviceOrder(vidx)

    return switchVideoByDeviceId(deviceId, this.video)
      .then(() => this.curDeviceIdx = vidx)
  }

  connectNext() {
    const vidx = getNextVideoIdx(this.curDeviceIdx)

    if (typeof vidx === 'number') {
      const deviceId = this.getDeviceIdFromDeviceOrder(vidx)

      return switchVideoByDeviceId(deviceId, this.video)
        .then(() => this.curDeviceIdx = vidx)
    }
    else {
      return Promise.reject('next not available')
    }
  }

  getDeviceIdFromDeviceOrder(videoIdx: VideoIdx): DeviceId {
    return this.deviceIdOrder[videoIdx]
  }

  disconnect() {
    return unattachStream(this.video)
  }

  pauseVideo() {
    this.video.pause()
  }

  playVideo() {
    this.video.play()
  }

  snapshot(snapOpts?: SnapOpts) {
    const sopts = snapOpts ? { ...this.snapOpts, ...snapOpts } : this.snapOpts
    this.pauseVideo()

    return takePhoto(this.video, sopts)
    .then(url => {
      this.playVideo()
      return url
    })
  }

}
