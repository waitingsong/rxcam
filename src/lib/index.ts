import { fromEvent, Observable, Subject } from 'rxjs'
import {
  debounceTime,
  filter,
  map,
  pluck,
} from 'rxjs/operators'

import {
  assertNever,
} from '../shared'

import {
  CamSym,
  Config,
  RxCamEvent,
  SnapOpts,
  StreamConfig,
  VideoConfig,
} from './model'


const initialVideoConfig: VideoConfig = {
  ctx: '',
  debug: false,
  devLabels: [],
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
  ...initialVideoConfig,
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

const initialConfig: Config = {
  multiOptions: [],
  ...initialVideoConfig,
  ...initialSnapParams,
}

let initialized = false


export function init(vconfig: VideoConfig, sopts?: SnapOpts): Subject<RxCamEvent> {
  if (initialized) {
    throw new Error('not initialize no more')
  }
  const subject = new Subject<RxCamEvent>()

  const sym = Symbol(Math.random())
  const initialRxCamEvent: RxCamEvent = {
    action: 'n/a',
    payload: { sym },
  }
  const stream$ = bindClickEvent()

  stream$
    .pipe(
      map((elm: any) => {
        console.log('elm:', elm)

        const eventAction = <RxCamEvent> { ...initialRxCamEvent }

        return eventAction
      })
    )
    .subscribe(subject)

  subject.subscribe(ev => {
    console.log('inner ev', ev)
  })

  initialized = true
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
