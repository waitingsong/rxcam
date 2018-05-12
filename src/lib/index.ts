import { initialDefaultStreamConfig, initialSnapOpts, initialVideoConfig } from './config'
import {
  findDevices,
  getMediaDeviceInfo,
  getNextVideoIdx,
  invokePermission,
  parseMediaOrder,
} from './device'
import {
  switchVideoByDeviceId,
  takePhoto,
  takeThumbnail,
  unattachStream,
} from './media'
import {
  BaseStreamConfig,
  DeviceId,
  ImgCaptureRet,
  ImgOpts,
  InitialOpts,
  SnapOpts,
  StreamConfig,
  StreamConfigMap,
  StreamIdx,
  SConfig,
  VideoConfig,
} from './model'
import { calcVideoMaxResolution, initUI } from './ui'


export class RxCam {
  curStreamIdx: StreamIdx
  sconfigMap: StreamConfigMap

  constructor(
    public vconfig: VideoConfig,
    public snapOpts: SnapOpts,
    public video: HTMLVideoElement,
    public dsconfig: BaseStreamConfig,
    public streamConfigs: StreamConfig[],
  ) {
    this.curStreamIdx = 0
    this.sconfigMap = parseMediaOrder(this.dsconfig, this.streamConfigs)
  }


  connect(streamIdx?: StreamIdx): Promise<MediaStreamConstraints> {
    const sidx = streamIdx ? +streamIdx : 0
    const deviceId = this.getDeviceIdFromMap(sidx)
    const { width, height } = this.getStreamResolution(sidx)

    return switchVideoByDeviceId(deviceId, this.video, width, height)
      .then(constraints => {
        this.curStreamIdx = sidx
        return constraints
      })
      .catch(err => this.retryConnect(err, deviceId, sidx, width, height))
      .catch(err => this.retryConnect(err, deviceId, sidx, width, height))
      .then(constraints => {
        const vOpts = <MediaTrackConstraints> constraints.video
        const w = <number> (<ConstrainLongRange> vOpts.width).ideal
        const h = <number> (<ConstrainLongRange> vOpts.height).ideal

        this.curStreamIdx = sidx
        this.updateStreamResolution(sidx, +w, +h)
        return constraints
      })
  }


  connectNext(): Promise<MediaStreamConstraints> {
    const sidx = getNextVideoIdx(this.curStreamIdx)

    if (typeof sidx === 'number') {
      const deviceId = this.getDeviceIdFromMap(sidx)
      const { width, height } = this.getStreamResolution(sidx)

      return switchVideoByDeviceId(deviceId, this.video, width, height)
        .then(constraints => {
          this.curStreamIdx = sidx
          return constraints
        })
        .catch(err => this.retryConnect(err, deviceId, sidx, width, height))
        .catch(err => this.retryConnect(err, deviceId, sidx, width, height))
        .then(constraints => {
          const vOpts = <MediaTrackConstraints> constraints.video
          const w = <number> (<ConstrainLongRange> vOpts.width).ideal
          const h = <number> (<ConstrainLongRange> vOpts.height).ideal

          this.curStreamIdx = sidx
          this.updateStreamResolution(sidx, +w, +h)
          return constraints
        })
    }
    else {
      return Promise.reject('next not available')
    }
  }

  isPlaying(): boolean {
    return this.video && this.video.played.length ? true : false
  }

  getDeviceIdFromMap(sidx: StreamIdx): DeviceId {
    const info = this.sconfigMap.get(sidx)
    return info ? info.deviceId : ''
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
    const { width, height } = this.getStreamResolution(this.curStreamIdx)
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


  getAllVideoInfo() {
    const ret = <MediaDeviceInfo[]> []

    for (const { deviceId } of this.sconfigMap.values()) {
      const info = getMediaDeviceInfo(deviceId)
      info && ret.push(info)
    }

    return ret
  }


  thumbnail(imgURL: string, options: ImgOpts): Promise<string> {
    return takeThumbnail(imgURL, options)
  }


  switchVideo(deviceId: DeviceId, width: number, height: number) {
    return switchVideoByDeviceId(deviceId, this.video, width, height)
  }


  getSConfig(sidx: StreamIdx): SConfig {
    const sconfig = this.sconfigMap.get(+sidx)

    if (! sconfig) {
      throw new Error(`invalid sidx: ${sidx}`)
    }
    return sconfig
  }

  // get rotate value of streamConfig by sidx if defined
  private getStreamConfigRotate(sidx: StreamIdx): number {
    const { rotate } = this.getSConfig(sidx)

    return rotate ? +rotate : 0
  }

  // for switchVideo
  private getStreamResolution(sidx: StreamIdx): BaseStreamConfig {
    const sconfig = this.getSConfig(sidx)
    const ret: BaseStreamConfig = {
      width: sconfig.width,
      height: sconfig.height,
      minWidth: sconfig.minWidth,
      minHeight: sconfig.minHeight,
      rotate: sconfig.rotate ? sconfig.rotate : 0,
    }

    if (ret.minWidth && ret.minWidth > ret.width) {
      ret.minWidth = ret.width
      ret.minHeight = ret.height
    }

    return ret
  }

  private updateStreamResolution(sidx: StreamIdx, width: number, height: number) {
    const sconfig = this.getSConfig(sidx)

    if (sconfig) {
      sconfig.width = +width
      sconfig.height = +height
    }
  }

  // retry connect for specify type of error
  private retryConnect(
    err: Error,
    deviceId: DeviceId,
    sidx: StreamIdx,
    width: number,
    height: number,
  ): Promise<MediaStreamConstraints> {

    // [FF, Chrome]
    if (['OverconstrainedError', 'ConstraintNotSatisfiedError'].includes(err.name)) {
      if (typeof this.vconfig.retryRatio === 'number' && this.vconfig.retryRatio > 0) {
        return this.retryConnectWithLowerResulution(deviceId, sidx, width, height)
      }
      else {
        throw err
      }
    }
    else if (['NotReadableError', 'TrackStartError'].includes(err.name)) {
      try {
        this.disconnect()
      }
      catch (ex) {
        console.info(ex)
      }

      return switchVideoByDeviceId(
        deviceId,
        this.video,
        width,
        height,
      )
    }

    throw err
  }


  // retry connect for specify type of error
  private retryConnectWithLowerResulution(
    deviceId: DeviceId,
    sidx: StreamIdx,
    width: number,
    height: number,
  ): Promise<MediaStreamConstraints> {

    const ratio = <number> this.vconfig.retryRatio
    const width2 = Math.floor(width * ratio)
    const height2 = Math.floor(height * ratio)
    const { minWidth, minHeight } = this.getStreamResolution(sidx)

    if (width2 < 240) { // @HARDCODE
      throw new Error(`retry connect(${sidx}) fail with minimum config w/h: ${minWidth}/${minHeight}`)
    }
    else if (minWidth && minHeight) {
      if (width2 < minWidth || height2 < minHeight) {
        throw new Error(`retry connect(${sidx}) fail with minimum config w/h: ${minWidth}/${minHeight}`)
      }
    }

    return switchVideoByDeviceId(
      deviceId,
      this.video,
      width2,
      height2,
    )
    .catch(err => this.retryConnect(err, deviceId, sidx, width2, height2))
  }


} // end of class


export async function init(options: InitialOpts): Promise<RxCam> {
  const { config , ctx, skipInvokePermission, snapOpts, streamConfigs, defaultStreamConfig } = options
  const vconfig: VideoConfig = { ...initialVideoConfig, ...config }

  validateStreamConfigs(streamConfigs)
  let streamConfigs2: StreamConfig[] = []
  const defaultStreamConfig2 = parseDefaultStreamConfig(vconfig, defaultStreamConfig)
  let maxWidth = vconfig.width
  let maxHeight = vconfig.height

  if (streamConfigs && streamConfigs.length) {
    streamConfigs2 = parseStreamConfigs(streamConfigs, defaultStreamConfig2.width, defaultStreamConfig2.height)
    const [maxw, maxh] = calcVideoMaxResolution(streamConfigs2)

    if (maxw) {
      maxWidth = maxw
      maxHeight = maxh
    }
  }

  const [vconfig2, video] = initUI(ctx, vconfig, maxWidth, maxHeight)
  const sopts: SnapOpts = snapOpts
    ? { ...initialSnapOpts, ...snapOpts }
    : { ...initialSnapOpts, width: vconfig.width, height: vconfig.height }

  return resetDeviceInfo(skipInvokePermission)
    .then(() => new RxCam(vconfig2, sopts, video, defaultStreamConfig2, streamConfigs2))
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
      console.error(configs)
      throw new Error('config blank, At least one of width, height should has valid value')
    }
  }
}

/**
 * update streamConfig.width/height from vconfig/defaultStreamConfig if not assign
 */
function parseStreamConfigs(sconfigs: StreamConfig[], width: number, height: number): StreamConfig[] {
  for (const sconfig of sconfigs) {
    if (! sconfig.width && ! sconfig.height) {
      sconfig.width = +width
      sconfig.height = +height
    }
    if (sconfig.minWidth && sconfig.minWidth > sconfig.width) {
      sconfig.minWidth = sconfig.width
      sconfig.minWidth = sconfig.height
    }
  }

  return sconfigs
}

function parseDefaultStreamConfig(vconfig: VideoConfig, defaultStreamConfig?: Partial<BaseStreamConfig>) {
  const ret: BaseStreamConfig = { ...initialDefaultStreamConfig, ...defaultStreamConfig }

  return ret
}
