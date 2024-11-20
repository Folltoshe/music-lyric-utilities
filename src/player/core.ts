import { EMPTY_LYRIC_INFO, type LyricInfo, type LyricLine } from '@root/parser'
import { TimeoutTools, handleGetNow, EMPTY_CALLBACK } from '@root/utils'
import type { RequiredPlayerOptions, PlayerOptions } from './types'

export class LyricPlayer {
  private tools: {
    lineTimeout: TimeoutTools
    waitPlayTimeout: TimeoutTools
  }
  private events: {
    onLinePlay: RequiredPlayerOptions['onLinePlay']
    onSetLyric: RequiredPlayerOptions['onSetLyric']
  }
  private config: {
    offset: RequiredPlayerOptions['offset']
    playbackRate: RequiredPlayerOptions['playbackRate']
  }

  private currentStatus: {
    playing: boolean
    startTime: number
    performanceTime: number
  }
  private currentLyricInfo: LyricInfo
  private currentLineInfo: {
    now: number
    max: number
  }

  constructor({
    offset = 150,
    playbackRate = 1,
    onLinePlay = EMPTY_CALLBACK,
    onSetLyric = EMPTY_CALLBACK,
  }: PlayerOptions) {
    this.tools = {
      lineTimeout: new TimeoutTools(),
      waitPlayTimeout: new TimeoutTools(),
    }
    this.config = { offset, playbackRate }
    this.events = { onLinePlay, onSetLyric }

    this.currentStatus = {
      playing: false,
      performanceTime: 0,
      startTime: 0,
    }

    this.currentLyricInfo = EMPTY_LYRIC_INFO
    this.currentLineInfo = {
      now: 0,
      max: 0,
    }

    this.handleUpdateLyric()
  }

  private handleUpdateLyric() {
    this.events.onSetLyric(this.currentLyricInfo)
    this.currentLineInfo.max = this.currentLyricInfo.lines.length - 1
  }

  handleGetCurrentTime() {
    const now = handleGetNow()
    return (now - this.currentStatus.performanceTime) * this.config.playbackRate + this.currentStatus.startTime
  }
  private handleFindCurrentLine(time: number, start = 0) {
    if (time <= 0) return 0
    const length = this.currentLyricInfo.lines.length
    for (let index = start; index < length; index++) {
      if (time <= this.currentLyricInfo.lines[index].time) return index === 0 ? 0 : index - 1
    }
    return length - 1
  }

  private handlePlayMaxLine() {
    const currentLine = this.currentLyricInfo.lines[this.currentLineInfo.now]

    this.events.onLinePlay(this.currentLineInfo.now, currentLine)
    if (currentLine.duration > 0) {
      this.tools.lineTimeout.start(() => this.pause(), currentLine.duration)
    } else this.pause()
  }
  private handleLineRefresh() {
    if (!this.currentLyricInfo.config.canAutoScroll) return

    this.currentLineInfo.now++
    if (this.currentLineInfo.now >= this.currentLineInfo.max) {
      this.handlePlayMaxLine()
      return
    }

    const currentLine = this.currentLyricInfo.lines[this.currentLineInfo.now]
    const currentTime = this.handleGetCurrentTime()

    const driftTime = currentTime - currentLine.time
    if (driftTime >= 0 || this.currentLineInfo.now === 0) {
      const nextLine = this.currentLyricInfo.lines[this.currentLineInfo.now + 1]
      const delay = (nextLine.time - currentLine.time - driftTime) / this.config.playbackRate
      if (delay > 0) {
        if (this.currentStatus.playing) {
          this.tools.lineTimeout.start(() => {
            if (!this.currentStatus.playing) return
            this.handleLineRefresh()
          }, delay)
        }
        this.events.onLinePlay(this.currentLineInfo.now, currentLine)
      } else {
        const newCurLineNum = this.handleFindCurrentLine(currentTime, this.currentLineInfo.now + 1)
        if (newCurLineNum > this.currentLineInfo.now) this.currentLineInfo.now = newCurLineNum - 1
        this.handleLineRefresh()
      }
      return
    }
    this.currentLineInfo.now = this.handleFindCurrentLine(currentTime, this.currentLineInfo.now) - 1
    this.handleLineRefresh()
  }
  private handleLinePause() {
    if (!this.currentStatus.playing) return
    this.currentStatus.playing = false
    this.tools.lineTimeout.clear()

    if (this.currentLineInfo.now === this.currentLineInfo.max || !this.currentLyricInfo.config.canAutoScroll) return

    const currentLineNum = this.handleFindCurrentLine(this.handleGetCurrentTime())
    if (this.currentLineInfo.now !== currentLineNum) {
      this.currentLineInfo.now = currentLineNum
      this.events.onLinePlay(currentLineNum, this.currentLyricInfo.lines[currentLineNum])
    }
  }

  play(currentTime = 0) {
    if (!this.currentLyricInfo.lines.length) return

    this.pause()

    this.currentStatus.playing = true
    this.currentStatus.performanceTime = handleGetNow() - Math.trunc(this.config.offset + this.lyricInfo.config.offset)
    this.currentStatus.startTime = currentTime

    this.currentLineInfo.now = this.handleFindCurrentLine(this.handleGetCurrentTime()) - 1
    this.handleLineRefresh()
  }
  pause() {
    this.handleLinePause()
  }

  updatePlaybackRate(playbackRate: RequiredPlayerOptions['playbackRate']) {
    this.config.playbackRate = playbackRate
    if (!this.currentLyricInfo.lines.length) return
    if (!this.currentStatus.playing) return
    this.play(this.handleGetCurrentTime())
  }
  updateOffset(offset: RequiredPlayerOptions['offset']) {
    this.config.offset = offset
  }
  updateLyric(lyricInfo: LyricInfo) {
    if (this.currentStatus.playing) this.pause()
    this.currentLyricInfo = lyricInfo
    this.handleUpdateLyric()
  }

  get status() {
    return this.currentStatus
  }
  get lyricInfo() {
    return this.currentLyricInfo
  }
  get lineInfo() {
    return this.currentLineInfo
  }
}
