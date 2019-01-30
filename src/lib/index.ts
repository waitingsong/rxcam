import {
  concat,
  defer,
  merge,
  of,
  throwError,
  timer,
  EMPTY,
  Observable,
  Subject,
  Subscription,
} from 'rxjs'
import {
  catchError,
  delay,
  map,
  mapTo,
  mergeMap,
  share,
  shareReplay,
  switchMap,
  tap,
  timeout,
} from 'rxjs/operators'

import {
  deviceChangeObb,
  initialDeviceChangDelay,
  initialEvent,
  initialSnapOpts,
  initialVideoConfig,
} from './config'
import {
  getMediaDeviceInfo,
  getNextVideoIdx,
  parseMediaOrder,
  resetDeviceInfo,
} from './device'
import { handleDeviceChange } from './event'
import {
  takePhoto,
  takeThumbnail,
} from './image'
import {
  switchVideoByDeviceId,
  unattachStream,
} from './media'
import {
  Actions,
  BaseStreamConfig,
  DeviceId,
  ImgCaptureRet,
  ImgOpts,
  InitialOpts,
  RxCamEvent,
  SnapOpts,
  StreamConfig,
  StreamConfigMap,
  StreamIdx,
  SConfig,
  VideoConfig,
} from './model'
import {
  parseDefaultStreamConfig,
  parseStreamConfigs,
  validateStreamConfigs,
} from './parse-options'
import { calcVideoMaxResolution, initUI, toggleImgPreview } from './ui'


export class RxCam {
  curStreamIdx: StreamIdx
  sconfigMap: StreamConfigMap
  eventObb: Observable<RxCamEvent>
  private deviceChangeSub: Subscription
  private disconnectBeforeSwitch = false
  private subject: Subject<RxCamEvent>

  constructor(
    public uiContext: HTMLElement,
    public vconfig: VideoConfig,
    public snapOpts: SnapOpts,
    public video: HTMLVideoElement,
    public dsconfig: BaseStreamConfig,
    public streamConfigs: StreamConfig[],
    public deviceChangeDelay: number,
  ) {

    this.curStreamIdx = 0
    this.sconfigMap = parseMediaOrder(this.dsconfig, this.streamConfigs)
    this.subject = new Subject()
    this.deviceChangeSub = this.processDeviceChange().subscribe()
    this.eventObb = this.initEvent()
  }

  connect(streamIdx?: StreamIdx): Observable<MediaStreamConstraints> {
    this.disconnectBeforeSwitch && this.disconnect()

    const sidx = streamIdx ? +streamIdx : 0
    const deviceId = this.getDeviceIdFromMap(sidx)
    const { width, height } = this.getStreamResolution(sidx)

    return this.swithDevice(deviceId, this.video, sidx, width, height)
  }


  connectNext(): Observable<MediaStreamConstraints> {
    this.disconnectBeforeSwitch && this.disconnect()

    const sidx = getNextVideoIdx(this.curStreamIdx)

    if (typeof sidx === 'number') {
      const deviceId = this.getDeviceIdFromMap(sidx)
      const { width, height } = this.getStreamResolution(sidx)
      return this.swithDevice(deviceId, this.video, sidx, width, height)
    }
    else {
      return throwError(new Error('Next stream not available'))
    }
  }

  isPlaying(): boolean {
    return this.video && this.video.played.length ? true : false
  }

  getDeviceIdFromMap(sidx: StreamIdx): DeviceId {
    const info = this.sconfigMap.get(sidx)
    return info ? info.deviceId : ''
  }


  disconnect() {
    try {
      unattachStream(this.video)
      this.subject.next({
        ...initialEvent,
        action: Actions.disconnected,
      })
    }
    catch (ex) {
      this.subject.next({
        ...initialEvent,
        action: Actions.exception,
        err: ex,
      })
    }
  }


  destroy() {
    this.disconnect()
    this.subject.unsubscribe()
    this.deviceChangeSub.unsubscribe()
  }


  pauseVideo() {
    this.video.pause()
  }

  playVideo() {
    this.video.play()
  }


  snapshot(snapOpts?: Partial<SnapOpts>): Observable<ImgCaptureRet> {
    const { width, height } = this.getStreamResolution(this.curStreamIdx)
    const sopts: SnapOpts = snapOpts
      ? { ...this.snapOpts, width, height, ...snapOpts }
      : { ...this.snapOpts, width, height }
    const { snapDelay, previewSnapRetSelector, previewSnapRetTime } = sopts

    if (typeof sopts.rotate === 'undefined') {
      sopts.rotate = this.getStreamConfigRotate(this.curStreamIdx)
    }

    const snap$ = timer(snapDelay > 0 ? snapDelay : 0).pipe(
      tap(() => this.pauseVideo()),
      switchMap(() => {
        return defer(() => takePhoto(this.video, sopts))
      }),
      // tap(url => {
      //   this.subject.next({
      //     ...initialEvent,
      //     action: Actions.takePhotoSucc,
      //     payload: { sopts, url },
      //   })
      // }),
      map(url => {
        return <ImgCaptureRet> { url, options: sopts }
      }),
      catchError((err: Error) => {
        this.playVideo()
        // this.subject.next({
        //   ...initialEvent,
        //   action: Actions.takePhotoFail,
        //   err,
        //   payload: { sopts },
        // })
        throw err
      }),
      timeout(10000 + snapDelay),
      tap(() => {
        this.playVideo()
      }),
      shareReplay(1),
    )

    const preview$ = snap$.pipe(
      switchMap(ret => {
        if (previewSnapRetTime > 0) {
          const elm = previewSnapRetSelector
            ? <HTMLImageElement> document.querySelector(previewSnapRetSelector)
            : <HTMLImageElement> this.uiContext.querySelector(previewSnapRetSelector)

          return toggleImgPreview(elm, ret.url).pipe(
            delay(previewSnapRetTime),
            switchMap(() => toggleImgPreview(elm, '')),
          )
        }
        else {
          return of(null)
        }
      }),
      mergeMap(() => EMPTY),
    )

    const ret$ = concat(
      snap$,
      preview$,
    )
    return ret$
  }


  getAllVideoInfo(): MediaDeviceInfo[] {
    const ret = <MediaDeviceInfo[]> []

    for (const { deviceId } of this.sconfigMap.values()) {
      const info = getMediaDeviceInfo(deviceId)
      info && ret.push(info)
    }

    return ret
  }


  /** Take image thumbnail, output DataURL or ObjectURL of resampled jpeg */
  thumbnail(imgURL: string, options: ImgOpts): Observable<string> {
    return takeThumbnail(imgURL, options)
  }


  switchVideo(deviceId: DeviceId, width: number, height: number): Observable<MediaStreamConstraints> {
    return switchVideoByDeviceId(deviceId, this.video, width, height)
  }


  getSConfig(sidx: StreamIdx): SConfig {
    const sconfig = this.sconfigMap.get(+sidx)

    if (! sconfig) {
      throw new Error(`getSConfig() sconfig empty invalid sidx: ${sidx}`)
    }
    return sconfig
  }

  // -------------

  private processDeviceChange() {
    const ret$ = handleDeviceChange(deviceChangeObb, this.deviceChangeDelay).pipe(
      tap(mediaCount => {
        this.subject.next({
          ...initialEvent,
          action: mediaCount > 0 ? Actions.deviceChange : Actions.deviceRemoved,
        })
      }),
      tap(size => {
        if (size > 0) { // device changed
          this.sconfigMap = parseMediaOrder(this.dsconfig, this.streamConfigs)

          if (this.sconfigMap.size) {
            try {
              this.getSConfig(this.curStreamIdx)  // ready
            }
            catch (ex) {
              this.disconnect()
            }
          }
          else {
            this.disconnect()
          }
        }
        else {  // device removed
          this.sconfigMap.clear()
          this.disconnect()
        }
      }),
      switchMap(size => {
        if (this.getAllVideoInfo().length && !this.isPlaying()) {
          return this.connect(this.curStreamIdx).pipe(
            mapTo(size),
          )
        }
        return of(0)
      }),
      catchError((err: Error) => {
        console.error(err)
        this.sconfigMap.clear()
        this.disconnect()
        this.subject.next({
          ...initialEvent,
          action: Actions.exception,
          err,
        })
        return of(0)
      }),
      share(),
    )

    return ret$
  }



  private swithDevice(
    deviceId: DeviceId,
    video: HTMLVideoElement,
    sidx: StreamIdx,
    width: number,
    height: number,
   ): Observable<MediaStreamConstraints> {

    const ret$ = switchVideoByDeviceId(deviceId, video, width, height).pipe(
      catchError((err: Error) => this.retryConnect(err, deviceId, sidx, width, height)),
      catchError((err: Error) => this.retryConnect(err, deviceId, sidx, width, height)),  // catch twice
      tap(constraints => {
        const vOpts = <MediaTrackConstraints> constraints.video
        const w = <number> (<ConstrainLongRange> vOpts.width).ideal
        const h = <number> (<ConstrainLongRange> vOpts.height).ideal

        this.curStreamIdx = sidx
        this.updateStreamResolution(sidx, +w, +h)

        this.subject.next({
          ...initialEvent,
          action: Actions.connected,
          payload: { constraints, deviceId, sidx },
        })
      }),
      catchError((err: Error) => {
        this.subject.next({
          ...initialEvent,
          action: Actions.exception,
          err,
        })
        throw err
      }),
    )

    return ret$
  }

  private initEvent(): Observable<RxCamEvent> {
    const innerSubject$ = this.subject.asObservable()
    const deviceChange$ = this.processDeviceChange().pipe(
      map(mediaDeviceCount => {
        return <RxCamEvent> {
          ...initialEvent,
          action: mediaDeviceCount > 0 ? Actions.deviceChange : Actions.deviceRemoved,
        }
      }),
    )
    const ret$ = merge(
      innerSubject$,
      deviceChange$,
    )

    return ret$
  }


  // get rotate value of streamConfig by sidx if defined
  private getStreamConfigRotate(sidx: StreamIdx): number {
    const { rotate } = this.getSConfig(sidx)

    return rotate ? +rotate : 0
  }

  // for switchVideo
  private getStreamResolution(sidx: StreamIdx): BaseStreamConfig {
    const sconfig = this.getSConfig(sidx)
    const ret: BaseStreamConfig = {
      width: sconfig.width,
      height: sconfig.height,
      minWidth: sconfig.minWidth,
      minHeight: sconfig.minHeight,
      rotate: sconfig.rotate ? sconfig.rotate : 0,
    }

    if (ret.minWidth && ret.minWidth > ret.width) {
      ret.minWidth = ret.width
      ret.minHeight = ret.height
    }

    return ret
  }


  private updateStreamResolution(sidx: StreamIdx, width: number, height: number) {
    const sconfig = this.getSConfig(sidx)

    if (sconfig && sconfig.width !== width) {
      sconfig.width = +width
      sconfig.height = +height
    }
  }

  /** Retry connect for specify type of error */
  private retryConnect(
    err: Error,
    deviceId: DeviceId,
    sidx: StreamIdx,
    width: number,
    height: number,
  ): Observable<MediaStreamConstraints> {

    this.subject.next({
      ...initialEvent,
      action: Actions.retryConnect,
      err,
    })

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
      this.disconnect()

      return switchVideoByDeviceId(
        deviceId,
        this.video,
        width,
        height,
      ).pipe(
        tap(() => {
          this.disconnectBeforeSwitch = true
        }),
      )
    }

    throw err
  }


  /** Retry connect for specify type of error */
  private retryConnectWithLowerResulution(
    deviceId: DeviceId,
    sidx: StreamIdx,
    width: number,
    height: number,
  ): Observable<MediaStreamConstraints> {

    const ratio = <number> this.vconfig.retryRatio
    const width2 = Math.floor(width * ratio)
    const height2 = Math.floor(height * ratio)
    const { minWidth, minHeight } = this.getStreamResolution(sidx)

    if (width2 < 240) { // @HARDCODE
      throw new Error(`Retry connect(${sidx}) fail with minimum config w/h: ${minWidth}/${minHeight}`)
    }
    else if (minWidth && minHeight) {
      if (width2 < minWidth || height2 < minHeight) {
        throw new Error(`Retry connect(${sidx}) fail with minimum config w/h: ${minWidth}/${minHeight}`)
      }
    }

    return switchVideoByDeviceId(
      deviceId,
      this.video,
      width2,
      height2,
    ).pipe(
      catchError((err: Error) => this.retryConnect(err, deviceId, sidx, width2, height2)),
    )
  }


} // end of class


export function RxCamFactory(options: InitialOpts): Observable<RxCam> {
  const {
    config,
    ctx,
    skipInvokePermission,
    snapOpts,
    streamConfigs,
    defaultStreamConfig,
    deviceChangeDelay,
  } = options
  const vconfig: VideoConfig = { ...initialVideoConfig, ...config }

  validateStreamConfigs(streamConfigs)
  let streamConfigs2: StreamConfig[] = []
  const defaultStreamConfig2 = parseDefaultStreamConfig(vconfig, defaultStreamConfig)
  let maxWidth = vconfig.width
  let maxHeight = vconfig.height

  if (streamConfigs && streamConfigs.length) {
    streamConfigs2 = parseStreamConfigs(streamConfigs, defaultStreamConfig2.width, defaultStreamConfig2.height)
    const [maxw, maxh] = calcVideoMaxResolution(streamConfigs2)

    if (maxw) {
      maxWidth = maxw
      maxHeight = maxh
    }
  }

  const [vconfig2, video] = initUI(ctx, vconfig, maxWidth, maxHeight)
  const sopts: SnapOpts = snapOpts
    ? { ...initialSnapOpts, ...snapOpts }
    : { ...initialSnapOpts, width: vconfig.width, height: vconfig.height }

  const initArgs = {
    c: ctx,
    v: vconfig2,
    s: sopts,
    vi: video,
    dsc: defaultStreamConfig2,
    st: streamConfigs2,
    de: (typeof deviceChangeDelay === 'number' && deviceChangeDelay > 0
      ? deviceChangeDelay
      : initialDeviceChangDelay),
  }

  const inst$ = of(initArgs).pipe(
    mergeMap(opts => {
      const { c, v, s, vi, dsc, st, de } = opts
      return of(new RxCam(c, v, s, vi, dsc, st, de))
    }),
  )

  const ret$ = concat(
    resetDeviceInfo(skipInvokePermission),
    inst$,
  )

  return ret$
}
