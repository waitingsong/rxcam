import { initialDefaultStreamConfig } from './config'
import {
  BaseStreamConfig,
  StreamConfig,
  VideoConfig,
} from './model'


export function validateStreamConfigs(configs?: StreamConfig[]): void {
  if (! configs) {
    return
  }
  if (! Array.isArray(configs)) {
    throw new Error('streamConfigs must be Array')
  }
  if (! configs.length) {
    return
  }

  for (const config of configs) {
    if (! config) {
      console.error(configs)
      throw new Error('config blank, At least one of width, height should has valid value')
    }
  }
}


/**
 * update streamConfig.width/height from vconfig/defaultStreamConfig if not assign
 */
export function parseStreamConfigs(sconfigs: StreamConfig[], width: number, height: number): StreamConfig[] {
  for (const sconfig of sconfigs) {
    if (! sconfig.width && ! sconfig.height) {
      sconfig.width = +width
      sconfig.height = +height
    }
    if (sconfig.minWidth && sconfig.minWidth > sconfig.width) {
      sconfig.minWidth = sconfig.width
      sconfig.minWidth = sconfig.height
    }
  }

  return sconfigs
}


export function parseDefaultStreamConfig(vconfig: VideoConfig, defaultStreamConfig?: Partial<BaseStreamConfig>) {
  const ret: BaseStreamConfig = { ...initialDefaultStreamConfig, ...defaultStreamConfig }

  return ret
}
