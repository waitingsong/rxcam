import { init, resetDeviceInfo, RxCam } from './lib/index'
import { calcImgThumbResolution, exportFromCanvas, genCanvas, takeThumbnail } from './lib/media'


export * from './lib/model'
export {
  RxCam,
  init,
  resetDeviceInfo,

  calcImgThumbResolution,
  exportFromCanvas,
  genCanvas,
  takeThumbnail,
}
