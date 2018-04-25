import { fromEvent, Subject } from 'rxjs'
import {
  debounceTime,
  map,
  pluck,
} from 'rxjs/operators'
import { websocket } from 'rxjs/websocket'

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
  invokePermission,
} from './lib/device'
import {
  switchVideo,
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


let inited = false


export async function init(config: Partial<VideoConfig>, sopts?: SnapOpts): Promise<Subject<RxEvent>> {
  if (inited) {
    throw new Error('not initialize no more')
  }
  const subject = new Subject<RxEvent>()

  const sym = Symbol(Math.random())
  const initialRxEvent: RxEvent = {
    action: 'n/a',
    payload: { sym },
  }
  const stream$ = bindClickEvent()

  stream$
    .pipe(
      map((elm: any) => {
        console.info('elm:', elm)

        const eventAction = <RxEvent> { ...initialRxEvent }

        return eventAction
      })
    )
    .subscribe(subject)

  subject.subscribe(ev => {
    console.info('inner ev', ev)
  })

  const [vconfig, video] = initUI(config)

  try {
    await invokePermission()
    await connect(0, video)
  }
  catch (ex) {
    console.info('camera access permission rejected')
  }

  inited = true
  return subject
}

function bindClickEvent(ctx?: HTMLDivElement) {
  return fromEvent<MouseEvent>(document, 'click')
    .pipe(
      debounceTime(50),
      pluck<MouseEvent, HTMLElement>('target')
      // filter(eventFilter)
    )
  // return fromEvent<MouseEvent>(ctx, 'click', true)
  //   .pipe(
  //     debounceTime(50),
  //     pluck<MouseEvent, HTMLElement>('target'),
  //     filter(eventFilter)
  //   )
}

export function connect(videoIdx: VideoIdx, video: HTMLVideoElement) {
  return switchVideo(videoIdx, video)
}
