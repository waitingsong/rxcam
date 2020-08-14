export type CamIdx = number // index of multi cameras
export type CamSym = symbol
export type DeviceId = string
export type MatchLabel = string | RegExp
export type DeviceLabelOrder = MatchLabel[]
export type Guid = number
export type ImgDataType = 'dataURL' | 'dataurl' | 'objectURL' | 'objecturl'
export type ImgMimeType = 'jpeg' | 'png' | 'webp'
export type StreamIdx = number // the track index of camera output. 0 for primaray/master, 1 for secondary/slave
export type VideoIdx = number // the video track index of camera output. 0 for primaray/master, 1 for secondary/slave


export interface InitialOpts {
  config: Partial<VideoConfig>
  ctx: HTMLElement
  debug?: boolean
  deviceChangeDelay?: number // msec
  snapOpts?: SnapOpts
  streamConfigs?: StreamConfig[]
  defaultStreamConfig?: BaseStreamConfig
  skipInvokePermission?: boolean
}


export interface VideoConfig {
  flipHoriz: boolean
  fps: number
  width: number // for preview
  height: number // for preview
  retryRatio?: number // retry lower width/height constraints if connect() fail
}

export interface BaseStreamConfig {
  width: number
  height: number
  minWidth?: number // for retry connect
  minHeight?: number // for retry connect
  rotate?: number | null // override by SnapOpt.rotate
}
export interface StreamConfig extends BaseStreamConfig {
  matchLabels?: MatchLabel[]
}
export interface SConfig extends StreamConfig {
  deviceId: DeviceId
}

export type StreamConfigMap = Map<StreamIdx, SConfig>

export interface SnapOpts {
  dataType: ImgDataType
  imageFormat: ImgMimeType
  flipHoriz: boolean
  width: number
  height: number
  /** Image encoding quality for jpeg/webp during canvas.toBlob() */
  jpegQuality: number
  /**
   * Selector of image showing snapshot result.
   * Default '.rxcam-snapshot-preview'
   */
  previewSnapRetSelector: string
  /**
   * Whether draw snapshoot result iamge above vedio zone.
   * 0: not draw, Default: 0(msec)
   */
  previewSnapRetTime: number
  rotate: number | null // angular
  streamIdx: StreamIdx
  snapDelay: number
  switchDelay: number
}

export interface ImgOpts {
  dataType: ImgDataType
  width: number
  height: number
  imageFormat: ImgMimeType
  jpegQuality: number // 0-100 for output
}

export interface ImgCaptureRet {
  url: string // DataURL or ObjectURL
  options: SnapOpts
}

export const enum Actions {
  exception = 'exception',
  initial = 'initial',
  noneAvailable = 'eventNoneAvailable',
  connected = 'connected',
  deviceChange = 'onDeviceChange',
  deviceRemoved = 'deviceRemoved',
  disconnected = 'disconnected',
  retryConnect = 'retryConnect',
  ready = 'ready',
  takePhoto = 'takePhoto',
  takePhotoSucc = 'takePhotoSucc',
  takePhotoFail = 'takePhotoFail',
}

export interface RxCamEvent {
  action: Actions
  msg?: string
  err?: Error
  payload?: any
}
