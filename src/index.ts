import { fromEvent, Subject } from 'rxjs'
import {
  debounceTime,
  map,
  pluck,
} from 'rxjs/operators'

import {
  initialSnapParams,
} from './lib/config'
import {
  findDevices,
  getNextVideoIdx,
  invokePermission,
  parseDeviceIdOrder,
} from './lib/device'
import {
  switchVideo, unattachStream,
} from './lib/media'
import {
  DeviceId,
  DeviceLabelOrder,
  InitialOpts,
  SnapOpts,
  VideoConfig,
  VideoIdx,
} from './lib/model'
import {
  initUI,
} from './lib/ui'


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
  curVideoIdx: VideoIdx
  deviceIdOrder: DeviceId[] // match by deviceOrderbyLabel

  constructor(
    public vconfig: VideoConfig,
    public snapOpts: SnapOpts,
    public video: HTMLVideoElement,
    public deviceLabelOrder: DeviceLabelOrder
  ) {
    debugger
    this.curVideoIdx = 0
    this.deviceIdOrder = parseDeviceIdOrder(deviceLabelOrder)
  }

  connect(videoIdx?: VideoIdx) {
    const vidx = videoIdx ? videoIdx : 0

    return switchVideo(vidx, this.video)
      .then(curVideoIdx => this.curVideoIdx = curVideoIdx)
  }

  connectNext() {
    const vidx = getNextVideoIdx(this.curVideoIdx)

    if (typeof vidx === 'number') {
      return switchVideo(vidx, this.video)
        .then(curVideoIdx => this.curVideoIdx = curVideoIdx)
    }
    else {
      return Promise.reject('next not available')
    }
  }

  disConnect() {
    return unattachStream(this.video)
  }

}
