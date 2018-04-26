import { fromEvent, Subject } from 'rxjs'
import {
  debounceTime,
  map,
  pluck,
} from 'rxjs/operators'

import {
  Config,
  RxEvent,
  SnapOpts,
  StreamConfig,
  VideoConfig,
  VideoIdx,
} from './lib/model'
import {
  assertNever,
} from './shared'

import {
  findDevices,
  getNextVideoIdx,
  invokePermission,
} from './lib/device'
import {
  switchVideo, unattachStream,
} from './lib/media'
import {
  initUI,
} from './lib/ui'


const initialStreamConfig: StreamConfig = {
  streamIdx: 0,
  deviceName: '',
  deviceId: '',  // MediaTrackConstraints.deviceId
}

const initialSnapParams: SnapOpts = {
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



export async function init(config: Partial<VideoConfig>, snapOpts?: SnapOpts): Promise<Webcam> {
  // const subject = new Subject<RxEvent>()

  // const sym = Symbol(Math.random())
  // const initialRxEvent: RxEvent = {
  //   action: 'n/a',
  //   payload: { sym },
  // }
  // const stream$ = bindClickEvent()

  // stream$
  //   .pipe(
  //     map((elm: any) => {
  //       console.info('elm:', elm)

  //       const eventAction = <RxEvent> { ...initialRxEvent }

  //       return eventAction
  //     })
  //   )
  //   .subscribe(subject)

  // subject.subscribe(ev => {
  //   console.info('inner ev', ev)
  // })

  const [vconfig, video] = initUI(config)
  const sopts: SnapOpts = { ...initialSnapParams, ...snapOpts }

  try {
    await invokePermission()
    await findDevices()
  }
  catch (ex) {
    console.info(ex)
  }

  return new Webcam(vconfig, sopts, video)
}


export class Webcam {
  curVideoIdx: number

  constructor(public vconfig: VideoConfig, public snapOpts: SnapOpts, public video: HTMLVideoElement) {
    this.curVideoIdx = 0
  }

  connect(videoIdx?: VideoIdx) {
    const vidx = videoIdx ? videoIdx : 0

    return switchVideo(vidx, this.video)
      .then(curVideoIdx => this.curVideoIdx = curVideoIdx)
  }

  connectNext() {
    const vidx = getNextVideoIdx(this.curVideoIdx)

    if (typeof vidx === 'number') {
      return switchVideo(vidx, this.video)
        .then(curVideoIdx => this.curVideoIdx = curVideoIdx)
    }
    else {
      return Promise.reject('next not available')
    }
  }

  disConnect() {
    return unattachStream(this.video)
  }

}
