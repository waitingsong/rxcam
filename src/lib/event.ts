import { Observable } from 'rxjs'
import {
  debounceTime,
  mapTo,
  switchMap,
  tap,
} from 'rxjs/operators'

// import { initialEvent, videoIdxMap } from './config'
import { videoIdxMap } from './config'
import { resetDeviceInfo, resetDeviceMap } from './device'
// import { Actions, RxCamEvent } from './model'

/** Return videoIdxMap.size */
export function handleDeviceChange(
  deviceChange$: Observable<Event>,
  deviceChangeDelay: number,
): Observable<number> {

  const ret$ = deviceChange$.pipe(
    debounceTime(deviceChangeDelay > 100 ? deviceChangeDelay : 100),
    tap(() => resetDeviceMap()),
    switchMap(() => resetDeviceInfo(true)),
    mapTo(videoIdxMap.size),
  )

  return ret$
}
