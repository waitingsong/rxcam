export type CamIdx = number // index of multi cameras
export type CamSym = symbol
export type DeviceId = string
export type DeviceLabel = string | RegExp
export type DeviceLabelOrder = DeviceLabel[]
export type Guid = number
export type ImgDataType = 'dataURL' | 'dataurl' | 'objectURL' | 'objecturl'
export type StreamIdx = number // the track index of camera output. 0 for primaray/master, 1 for secondary/slave
export type VideoIdx = number // the video track index of camera output. 0 for primaray/master, 1 for secondary/slave


export interface InitialOpts {
  config: Partial<VideoConfig>
  snapOpts?: SnapOpts
  deviceLabelOrder?: DeviceLabelOrder
}

export interface RxEvent {
  action: string
  payload: {
    sym?: CamSym
    [prop: string]: any,
  }
}

export interface VideoConfig {
  autoPlay: boolean
  ctx: HTMLElement
  debug: boolean
  flipHoriz: boolean
  fps: number
  width: number
  height: number
  deviceLabelOrder: Array<string | RegExp>
  previewWidth?: number // if omit use width value
  previewHeight?: number  // if omit use height value
  useDefault: boolean // use default camera during labelList empty
}

export interface StreamConfig {
  deviceName?: string
  deviceId?: string  // MediaTrackConstraints.deviceId
  streamIdx: StreamIdx
  [prop: string]: any
}

export interface SnapOpts {
  dataType: ImgDataType
  imageFormat: 'jpeg' | 'png'
  flipHoriz: boolean
  height: number
  jpegQuality: number
  streamIdx: StreamIdx
  snapDelay: number
  switchDelay: number
  width: number
}

export interface Webcam {
  guid: symbol
  ctx: HTMLDivElement
  video: HTMLVideoElement
  // config = <Config> { ...cam.config, ...config }
  inited: boolean
  live: boolean
  streamMap: Map<StreamIdx, MediaStream | void>
  streamConfigMap: Map<StreamIdx, StreamConfig>
  currStreamIdx: number
  retryCount: number
}
