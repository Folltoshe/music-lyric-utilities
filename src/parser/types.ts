export interface ParseLyricProps {
  original?: string
  translated?: string
  roman?: string
  dynamic?: string
}
export interface PureLyricInfo {
  canAutoScroll: boolean
  offset: number
  lines: {
    time: number
    lyric: string
    originalLyric?: string
    translatedLyric?: string
    romanLyric?: string
  }[]
}

export interface DynamicWordInfo {
  // 时间
  time: number
  // 时长
  duration: number
  // 内容
  text: string
  // 配置
  config: {
    // 是否为中日韩字符
    isCjk: boolean
    // 空格结尾
    isSpaceEnd: boolean
    // 尾部拖长音
    needTrailing: boolean
  }
}

export interface LyricLine {
  // 时间
  time: number
  // 时长
  duration: number
  // 歌词
  content: {
    // 原文
    original: string
    // 翻译
    translated?: string
    // 罗马音
    roman?: string
    // 动态
    dynamic?: {
      // 总时长
      time: number
      // 每个字符
      words: DynamicWordInfo[]
    }
  }
  // 配置
  config: {
    // 是否为间奏
    isInterlude: boolean
    // 是否为不支持滚动提示栏
    isNotSupportAutoScrollTip: boolean
  }
}
export interface LyricInfo {
  // 歌词内容
  lines: LyricLine[]
  // 配置
  config: {
    // 是否可以滚动
    canAutoScroll: boolean
    // 是否为纯音乐
    isPureMusic: boolean
    // 偏移
    offset: number
  }
}
