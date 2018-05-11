import { initialSnapOpts, initialVideoConfig } from './config'
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
  DeviceId,
  ImgCaptureRet,
  ImgOpts,
  InitialOpts,
  SnapOpts,
  StreamConfig,
  StreamIdx,
  VideoConfig,
  VideoResolutionConfig,
} from './model'
import { calcVideoMaxResolution, initUI } from './ui'


export class RxCam {
  curStreamIdx: StreamIdx
  deviceIdOrder: DeviceId[] // match by deviceOrderbyLabel

  constructor(
    public vconfig: VideoConfig,
    public snapOpts: SnapOpts,
    public video: HTMLVideoElement,
    public streamConfigs: StreamConfig[],
  ) {
    this.curStreamIdx = 0
    this.deviceIdOrder = parseMediaOrder(this.streamConfigs)
  }


  connect(streamIdx?: StreamIdx): Promise<MediaStreamConstraints> {
    const sidx = streamIdx ? +streamIdx : 0
    const deviceId = this.getDeviceIdFromDeviceOrder(sidx)
    const { width, height } = this.genStreamResolution(sidx)

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
      const deviceId = this.getDeviceIdFromDeviceOrder(sidx)
      const { width, height } = this.genStreamResolution(sidx)

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
    const { width, height } = this.genStreamResolution(this.curStreamIdx)
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

    for (const deviceId of this.deviceIdOrder) {
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

  switchVideo(deviceId: DeviceId, width: number, height: number) {
    return switchVideoByDeviceId(deviceId, this.video, width, height)
  }

  // for switchVideo
  private genStreamResolution(sidx: StreamIdx): VideoResolutionConfig {
    const sconfig = this.streamConfigs[sidx]
    const vconfig = this.vconfig
    const ret: VideoResolutionConfig = {
      width: vconfig.width,
      height: vconfig.height,
      minWidth: vconfig.minWidth ? vconfig.minWidth : vconfig.width,
      minHeight: vconfig.minHeight ? vconfig.minHeight : vconfig.height,
    }

    if (sconfig) {
      if (sconfig.width) {
        ret.width = sconfig.width
        ret.height = sconfig.height
      }
      if (sconfig.minWidth) {
        ret.minWidth = sconfig.minWidth
        ret.minHeight = <number> sconfig.minHeight
      }
    }

    if (ret.minWidth > ret.width) {
      ret.minWidth = ret.width
      ret.minHeight = ret.height
    }

    return ret
  }


  private updateStreamResolution(sidx: StreamIdx, width: number, height: number) {
    const sconfig = this.streamConfigs[sidx]

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
    const { minWidth, minHeight } = this.genStreamResolution(sidx)

    if (width2 < minWidth || height2 < minHeight || width2 < 240) {
      throw new Error(`retry connect(${sidx}) fail with minimum config w/h: ${minWidth}/${minHeight}`)
    }
    console.info(`retry connect(${sidx}). width/height: ${width}/${height}. ratio: ${ratio} to: ${width2}/${height2}.`)

    return switchVideoByDeviceId(
      deviceId,
      this.video,
      width2,
      height2,
    )
    .catch(err => this.retryConnect(err, deviceId, sidx, width2, height2))
  }


} // end of class


export async function init(initialOpts: InitialOpts): Promise<RxCam> {
  const { config , ctx, skipInvokePermission, snapOpts, streamConfigs } = initialOpts
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
  const sopts: SnapOpts = snapOpts
    ? { ...initialSnapOpts, ...snapOpts }
    : { ...initialSnapOpts, width: vconfig.width, height: vconfig.height }

  return resetDeviceInfo(skipInvokePermission)
    .then(() => new RxCam(vconfig2, sopts, video, sconfigs))
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
