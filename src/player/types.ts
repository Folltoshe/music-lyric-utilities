import type { LyricInfo, LyricLine } from '@root/parser'

export interface PlayerOptions {
  /**
   * Listening lyric line play event
   * @param line line number of current play
   * @param info line info
   */
  onLinePlay?: (lineNum: number, info: LyricLine) => void

  /**
   * listening lyrics seting event
   * @param lines array of all lyric text
   */
  onSetLyric?: (info: LyricInfo) => void

  /**
   * offset time(ms), default is 150 ms
   */
  offset?: number

  /**
   * playback rate, default is 1
   */
  playbackRate?: number
}
export type RequiredPlayerOptions = Required<PlayerOptions>
