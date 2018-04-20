export type Guid = number
export type CamIdx = number // index of multi cameras
export type StreamIdx = number // the track index of camera output. 0 for primaray/master, 1 for secondary/slave
export type DevLabel = string
export type stor = string | HTMLElement
export type ImgDataType = 'dataURL' | 'dataurl' | 'objectURL' | 'objecturl'
export type CamSym = symbol

export interface RxCamEvent {
  action: string
  payload: {
    sym?: CamSym
    [prop: string]: any,
  }
}

export interface VideoConfig {
  ctx: stor
  debug: boolean
  devLabels?: DevLabel[]
  flipHoriz: boolean
  fps: number
  previewHeight: number
  previewWidth: number
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

export interface Config extends VideoConfig, SnapOpts {
  multiOptions?: StreamConfig[]
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
