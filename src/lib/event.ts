import { Subject, Subscription } from 'rxjs'
import {
  throttleTime,
} from 'rxjs/operators'

import { deviceChange$, initialEvent } from './config'
import { resetDeviceInfo, resetDeviceMap } from './device'
import { Actions, RxCamEvent } from './model'


export function subscribeDeviceChange(subject: Subject<RxCamEvent>) {
  return deviceChange$
    .pipe(
      throttleTime(600),
    )
    .subscribe(() => {
      subject.next({
        ...initialEvent,
        action: Actions.deviceChange,
      })
    })
}

export function handleDeviceChange() {
  resetDeviceMap()
  return resetDeviceInfo(true)
}
