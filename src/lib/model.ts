export type CamIdx = number // index of multi cameras
export type CamSym = symbol
export type DeviceId = string
export type DeviceLabel = string | RegExp
export type DeviceLabelOrder = DeviceLabel[]
export type Guid = number
export type ImgDataType = 'dataURL' | 'dataurl' | 'objectURL' | 'objecturl'
export type ImgFormat = 'jpeg' | 'png'
export type StreamIdx = number // the track index of camera output. 0 for primaray/master, 1 for secondary/slave
export type VideoIdx = number // the video track index of camera output. 0 for primaray/master, 1 for secondary/slave


export interface InitialOpts {
  config: Partial<VideoConfig>
  ctx: HTMLElement
  debug?: boolean
  snapOpts?: SnapOpts
  deviceLabelOrder?: DeviceLabelOrder
  streamConfigs?: StreamConfig[]
}

export interface RxEvent {
  action: string
  payload: {
    sym?: CamSym
    [prop: string]: any,
  }
}

export interface VideoConfig {
  flipHoriz: boolean
  fps: number
  width: number   // maybe override by max of StreamConfig['width]
  height: number  // maybe override by max of StreamConfig['height']
  deviceLabelOrder: Array<string | RegExp>
  previewWidth?: number // if omit use width value
  previewHeight?: number  // if omit use height value
}

export interface StreamConfig {
  streamIdx: StreamIdx
  width: number
  height: number
}

export interface SnapOpts {
  dataType: ImgDataType
  imageFormat: ImgFormat
  flipHoriz: boolean
  width: number
  height: number
  jpegQuality: number
  rotate: number  // angular
  streamIdx: StreamIdx
  snapDelay: number
  switchDelay: number
}

export interface ImgOpts {
  dataType: ImgDataType
  width: number
  height: number
  imageFormat: ImgFormat
  jpegQuality: number // 0-100 for output
}
