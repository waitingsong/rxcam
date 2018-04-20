export type Guid = number
export type CamIdx = number // index of multi cameras
export type StreamIdx = number // the track index of camera output. 0 for primaray/master, 1 for secondary/slave
export type DevLabel = string
export type stor = string | HTMLElement
export type ImgDataType = 'dataURL' | 'dataurl' | 'objectURL' | 'objecturl'


export interface BaseConfig {
  ctx: stor
  debug: boolean
  devLabels: string[] | null
  flipHoriz: boolean
  fps: number
  previewHeight: number
  previewWidth: number
  useDefault: boolean // use default camera during labelList empty
}

export interface StreamConfig extends BaseConfig {
  deviceName?: string
  deviceId?: string  // MediaTrackConstraints.deviceId
  streamIdx: StreamIdx
  [prop: string]: any
}

export interface SnapParams {
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

export interface Config extends BaseConfig, SnapParams {
  multiOptions?: StreamConfig[]
}

export interface Webcam {
  guid: symbol
  ctx: HTMLDivElement
  video: HTMLVideoElement
  // config = <Config> { ...cam.config, ...config }
  inited: boolean
  live: boolean
  streamMap: Map
  streamConfigMap: Map
  currStreamIdx: number
  retryCount: number
}
