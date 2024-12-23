import type { LyricInfo, LyricLine, DynamicWordInfo, RequiredParserOptions } from './types'

export const DEFAULT_PARSER_OPTIONS: RequiredParserOptions = {
  isShowNotSupportAutoScrollTipLine: false,
}

export const PURE_MUSIC_LYRIC_LINE: LyricLine[] = [
  {
    time: 0,
    duration: 5940000,
    content: {
      original: '纯音乐，请欣赏',
    },
    config: {
      isInterlude: false,
      isNotSupportAutoScrollTip: false,
    },
  },
]

export const EMPTY_LYRIC_INFO: LyricInfo = {
  lines: [],
  config: {
    canAutoScroll: false,
    isPureMusic: false,
    offset: 0,
  },
} as const
export const EMPTY_LYRIC_LINE: LyricLine = {
  time: 0,
  duration: 0,
  content: {
    original: '',
  },
  config: {
    isInterlude: false,
    isNotSupportAutoScrollTip: false,
  },
} as const
export const EMPTY_DYNAMIC_WORD: DynamicWordInfo = {
  time: 0,
  duration: 0,
  text: '',
  config: {
    isCjk: false,
    isSpaceEnd: false,
    needTrailing: false,
  },
} as const
