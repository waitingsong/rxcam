import { resetDeviceInfo } from './lib/device'
import { init, RxCam } from './lib/index'
import { calcImgThumbResolution, exportFromCanvas, genCanvas, takeThumbnail } from './lib/media'


export * from './lib/model'
export {
  RxCam,
  init,

  calcImgThumbResolution,
  exportFromCanvas,
  genCanvas,
  resetDeviceInfo,
  takeThumbnail,
}
