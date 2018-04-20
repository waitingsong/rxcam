import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { Observable, Subscribable } from 'rxjs/Observable'
import { AnonymousSubscription } from 'rxjs/Subscription'
import {
  pluck,

} from 'rxjs/operators'

import {
  assertNever,
} from '../shared/index'

import {
  BaseConfig,
  Config,
  SnapParams,
  StreamConfig,
} from './model'


const cam: Cam = {
  guid: 1,
  _instances: new Map(),  // guid:Inst
  config: {
    debug: false,
    useDefault: true,
    ctx: '',
    fps: 30,
    previewWidth: 320,
    previewHeight: 240,
    flipHoriz: false,
    width: 0,
    height: 0,
    imageFormat: 'jpeg',
    jpegQuality: 95,
    dataType: 'dataURL',
    // msec. waiting time for vedio ready to snap() when camera switching needed.
    // no switching no snap delay
    switchDelay: 100,
    snapDelay: 0,        // msec. waiting time before snap()
    /**
     * defined device's label
     *  ['Scanner', 'USB Camema', ...]
     */
    devLabels: null,
    multiOptions: null,
  },
  streamConfig: <StreamConfig> {
    streamIdx: -1,
    deviceName: '',
    deviceId: '',
  },
}

const initialBaseConfig: BaseConfig = {
  ctx: '',
  debug: false,
  devLabels: null,
  flipHoriz: false,
  fps: 30,
  previewWidth: 400,
  previewHeight: 300,
  useDefault: false, // use default camera during labelList empty
}

const initialStreamConfig: StreamConfig = {
  streamIdx: 0,
  deviceName: '',
  deviceId: '',  // MediaTrackConstraints.deviceId
  ...initialBaseConfig,
}

const initialSnapParams: SnapParams = {
  dataType: 'dataURL',
  imageFormat: 'jpeg',
  flipHoriz: false,
  width: 400,
  height: 300,
  jpegQuality: 95,
  streamIdx: 0,
  snapDelay: 100,
  switchDelay: 0,
}

const initialConfig: Config = {
  multiOptions: [],
  ...initialBaseConfig,
  ...initialSnapParams,
}


// const init = <Init> (config): Inst => {
export function init(config: Config) {
  if (config && typeof config === 'object') {
    const inst = this

    inst.guid = cam.guid
    inst.ctx = null
    inst.video = null
    inst.config = <Config> { ...cam.config, ...config }
    inst.inited = false
    inst.live = false
    inst.streamMap = new Map()
    inst.streamConfigMap = new Map()
    inst.currStreamIdx = -1
    inst.retryCount = 0
    cam.guid++

    if (inst.config.ctx) {
      if (typeof inst.config.ctx === 'string') {
        inst.ctx = <HTMLElement> document.body.querySelector(inst.config.ctx)
      }
      else if (inst.config.ctx instanceof HTMLElement) {
        if (document.body.contains(<HTMLElement> inst.config.ctx)) {
          inst.ctx = <HTMLElement> inst.config.ctx
        }
      }
    }
    else {
      throw new Error('video container ctx not exists')
    }

    _init(inst)
    if (inst.config.multiOptions && Array.isArray(inst.config.multiOptions)) {
      for (const opts of inst.config.multiOptions) {
        const sconfig = { ...cam.streamConfig, ...inst.config, ...opts }

        sconfig.multiOptions = null
        inst._set(sconfig)
      }
    }
    else {
      inst.config.multiOptions = null
      const sconfig = { ...cam.streamConfig, ...inst.config }

      inst._set(sconfig)
    }

    cam._instances.set(inst.guid, inst)
    // devList maybe empty at this time
    return inst
  }
  else {
    throw new Error('initialize params missing')
  }
}
