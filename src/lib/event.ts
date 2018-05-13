import { from, of, Subject, Subscription } from 'rxjs'
import {
  catchError,
  delay,
  map,
  switchMap,
  tap,
  throttleTime,
} from 'rxjs/operators'

import { deviceChange$, initialEvent, videoIdxMap } from './config'
import { findDevices, resetDeviceInfo, resetDeviceMap } from './device'
import { Actions, RxCamEvent } from './model'


export function subscribeDeviceChange(subject: Subject<RxCamEvent>, deviceChangeDelay: number) {
  return deviceChange$
    .pipe(
      throttleTime(600),
      switchMap(() => {
        return from(
          handleDeviceChange()
            .then(() => {
              const size = videoIdxMap.size
              return size
            }),
        )
      }),
      switchMap(count => {
        return ! count
          ? of(count)
          : of(count)
            .pipe(
              delay(deviceChangeDelay),
              switchMap(() => {
                return from(
                  handleDeviceChange()
                    .then(() => videoIdxMap.size),
                )
              }))

      }),
      catchError(err => {
        subject.next({
          ...initialEvent,
          action: Actions.exception,
          err,
        })
        return of(0)
      }),
    )
    .subscribe(mediaCount => {
      subject.next({
        ...initialEvent,
        action: mediaCount > 0 ? Actions.deviceChange : Actions.deviceRemoved,
      })
    })
}

export function handleDeviceChange() {
  resetDeviceMap()
  return resetDeviceInfo(true)
}
