import { initialSnapOpts, initialVideoConfig } from './config'
import {
  findDevices,
  getMediaDeviceInfo,
  getNextVideoIdx,
  invokePermission,
  parseDeviceIdOrder,
} from './device'
import {
  switchVideoByDeviceId,
  takePhoto,
  takeThumbnail,
  unattachStream,
} from './media'
import {
  DeviceId,
  DeviceLabelOrder,
  ImgCaptureRet,
  ImgOpts,
  InitialOpts,
  SnapOpts,
  StreamConfig,
  StreamIdx,
  VideoConfig,
} from './model'
import { calcVideoMaxResolution, initUI } from './ui'


export class RxCam {
  curStreamIdx: StreamIdx

  constructor(
    public vconfig: VideoConfig,
    public snapOpts: SnapOpts,
    public video: HTMLVideoElement,
    public deviceLabelOrder: DeviceLabelOrder,
    public streamConfigs: StreamConfig[]
  ) {
    this.curStreamIdx = 0
    this.deviceIdOrder = parseDeviceIdOrder(deviceLabelOrder)
  }

  private deviceIdOrder: DeviceId[] // match by deviceOrderbyLabel


  connect(streamIdx?: StreamIdx): Promise<MediaStreamConstraints> {
    const sidx = streamIdx ? +streamIdx : 0
    const deviceId = this.getDeviceIdFromDeviceOrder(sidx)
    const [width, height] = this.genStreamResolution(sidx)

    return switchVideoByDeviceId(deviceId, this.video, width, height)
      .then(constraints => {
        this.curStreamIdx = sidx
        return constraints
      })
      .catch(err => {
        if (typeof err === 'object' && this.vconfig.retryRatio) {  // retry lower resolution
          return switchVideoByDeviceId(
            deviceId,
            this.video,
            width * this.vconfig.retryRatio,
            height * this.vconfig.retryRatio
          )
        }
        throw err
      })
  }


  connectNext(): Promise<MediaStreamConstraints> {
    const sidx = getNextVideoIdx(this.curStreamIdx)

    if (typeof sidx === 'number') {
      const deviceId = this.getDeviceIdFromDeviceOrder(sidx)
      const [width, height] = this.genStreamResolution(sidx)

      return switchVideoByDeviceId(deviceId, this.video, width, height)
        .then(constraints => {
          this.curStreamIdx = sidx
          return constraints
        })
        .catch(err => {
          if (typeof err === 'object' && this.vconfig.retryRatio) {  // retry lower resolution
            return switchVideoByDeviceId(
              deviceId,
              this.video,
              width * this.vconfig.retryRatio,
              height * this.vconfig.retryRatio
            )
          }
          throw err
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


  snapshot(snapOpts?: Partial<SnapOpts>): Promise<ImgCaptureRet> {
    const [width, height] = this.genStreamResolution(this.curStreamIdx)
    const sopts: SnapOpts = snapOpts
      ? { ...this.snapOpts, width, height, ...snapOpts }
      : { ...this.snapOpts, width, height }
    const { snapDelay } = sopts

    if (typeof sopts.rotate === 'undefined') {
      sopts.rotate = this.getStreamConfigRotate(this.curStreamIdx)
    }

    if (snapDelay > 0) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          takePhoto(this.video, sopts)
            .then(url => {
              resolve({ url, options: sopts })
            })
            .catch(reject)
        }, snapDelay)
      })
    }
    else {
      this.pauseVideo()

      return takePhoto(this.video, sopts)
        .then(url => {
          this.playVideo()
          return { url, options: sopts }
        })
        .catch(err => {
          this.playVideo()
          throw err
        })
    }
  }


  getDeviceIds() {
    return this.deviceIdOrder
  }


  getAllVideoInfo() {
    const ret = <MediaDeviceInfo[]> []

    for (let deviceId of this.deviceIdOrder) {
      // avoid to change to const during auto save fix. got error with other pkg rollup min output
      deviceId += ''
      const info = getMediaDeviceInfo(deviceId)

      info && ret.push(info)
    }
    return ret
  }


  thumbnail(imgURL: string, options: ImgOpts): Promise<string> {
    return takeThumbnail(imgURL, options)
  }


  // get rotate value of streamConfig by sidx if defined
  getStreamConfigRotate(sidx: StreamIdx): number {
    const rotate = this.streamConfigs[sidx]

    return rotate ? +rotate : 0
  }


  // for switchVideo
  private genStreamResolution(sidx: StreamIdx): [number, number] {
    const sconfig = this.streamConfigs[sidx]

    if (sconfig && sconfig.width) {
      return [sconfig.width, sconfig.height]
    }

    return [this.vconfig.width, this.vconfig.width]
  }


} // end of class


export async function init(initialOpts: InitialOpts): Promise<RxCam> {
  const { config , ctx, deviceLabelOrder, snapOpts, streamConfigs } = initialOpts
  const vconfig: VideoConfig = { ...initialVideoConfig, ...config }

  validateStreamConfigs(streamConfigs)
  let sconfigs: StreamConfig[] = []

  if (streamConfigs && streamConfigs.length) {
    sconfigs = parseStreamConfigs(streamConfigs, vconfig.width, vconfig.height)
    const [maxWidth, maxHeight] = calcVideoMaxResolution(sconfigs)

    vconfig.width = maxWidth
    vconfig.height = maxHeight
  }

  const [vconfig2, video] = initUI(ctx, vconfig)
  const labels = deviceLabelOrder && Array.isArray(deviceLabelOrder) ? deviceLabelOrder : []
  const sopts: SnapOpts = snapOpts
    ? { ...initialSnapOpts, ...snapOpts }
    : { ...initialSnapOpts, width: vconfig.width, height: vconfig.height }

  await resetDeviceInfo()

  return new RxCam(vconfig2, sopts, video, labels, sconfigs)
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

function validateStreamConfigs(configs?: StreamConfig[]): void {
  if (!configs) {
    return
  }
  if (! Array.isArray(configs)) {
    throw new Error('streamConfigs must be Array')
  }
  if (!configs.length) {
    return
  }

  for (const config of configs) {
    if (!config) {
      throw new Error('At least one of deviceId, label, streamIdx should has valid value')
    }
    else if (typeof config.streamIdx !== 'number') {
      throw new Error('At least one of deviceId, label, streamIdx should has valid value')
    }
  }
}

/**
 * update streamConfig.width/height from vconfig if not assign
 */
function parseStreamConfigs(sconfigs: StreamConfig[], width: number, height: number): StreamConfig[] {
  for (const config of sconfigs) {
    if (! config.width && ! config.height) {
      config.width = +width
      config.height = +height
    }
  }

  return sconfigs
}
