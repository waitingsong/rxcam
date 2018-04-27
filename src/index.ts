import { initialSnapOpts } from './lib/config'
import {
  findDevices,
  getMediaDeviceInfo,
  getNextVideoIdx,
  invokePermission,
  parseDeviceIdOrder,
} from './lib/device'
import { switchVideoByDeviceId, takePhoto, takeThumbnail, unattachStream } from './lib/media'
import {
  DeviceId,
  DeviceLabelOrder,
  ImgOpts,
  InitialOpts,
  SnapOpts,
  StreamIdx,
  VideoConfig,
} from './lib/model'
import { initUI } from './lib/ui'

export * from './lib/model'


export class RxCam {
  curStreamIdx: StreamIdx

  constructor(
    public vconfig: VideoConfig,
    public snapOpts: SnapOpts,
    public video: HTMLVideoElement,
    public deviceLabelOrder: DeviceLabelOrder
  ) {
    this.curStreamIdx = 0
    this.deviceIdOrder = parseDeviceIdOrder(deviceLabelOrder)
  }

  private deviceIdOrder: DeviceId[] // match by deviceOrderbyLabel

  connect(streamIdx?: StreamIdx) {
    const sidx = streamIdx ? +streamIdx : 0
    const deviceId = this.getDeviceIdFromDeviceOrder(sidx)

    return switchVideoByDeviceId(deviceId, this.video, this.vconfig.width, this.vconfig.height)
      .then(() => {
        this.curStreamIdx = sidx
      })
  }

  connectNext() {
    const sidx = getNextVideoIdx(this.curStreamIdx)

    if (typeof sidx === 'number') {
      const deviceId = this.getDeviceIdFromDeviceOrder(sidx)

      return switchVideoByDeviceId(deviceId, this.video, this.vconfig.width, this.vconfig.height)
        .then(() => {
          this.curStreamIdx = sidx
        })
    }
    else {
      return Promise.reject('next not available')
    }
  }

  getDeviceIdFromDeviceOrder(sidx: StreamIdx): DeviceId {
    return this.deviceIdOrder[sidx]
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
    const { snapDelay } = sopts

    if (snapDelay > 0) {
      return new Promise(resolve => {
        setTimeout(() => {
          takePhoto(this.video, sopts)
            .then(url => {
              resolve(url)
            })
        }, snapDelay)
      })
    }
    else {
      this.pauseVideo()

      return takePhoto(this.video, sopts)
        .then(url => {
          this.playVideo()
          return url
        })
    }
  }

  getDeviceIds() {
    return this.deviceIdOrder
  }

  getAllVideoInfo() {
    const ret = <MediaDeviceInfo[]> []

    for (const deviceId of this.deviceIdOrder) {
      const info = getMediaDeviceInfo(deviceId)

      info && ret.push(info)
    }
    return ret
  }

  thumbnail(imgURL: string, options: ImgOpts): Promise<string> {
    return takeThumbnail(imgURL, options)
  }
}

export async function init(initialOpts: InitialOpts): Promise<RxCam> {
  const { config , snapOpts, deviceLabelOrder } = initialOpts
  const [vconfig, video] = initUI(config)
  const sopts: SnapOpts = snapOpts
    ? { ...initialSnapOpts, ...snapOpts }
    : { ...initialSnapOpts, width: vconfig.width, height: vconfig.height }
  const labels = deviceLabelOrder && Array.isArray(deviceLabelOrder) ? deviceLabelOrder : []

  await resetDeviceInfo()

  return new RxCam(vconfig, sopts, video, labels)
}

export async function resetDeviceInfo(): Promise<void> {
  try {
    // resetDeviceMap()
    await invokePermission()
    await findDevices()
  }
  catch (ex) {
    console.info(ex)
  }
}
