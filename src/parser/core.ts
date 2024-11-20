import Lodash from 'lodash'
import type { LyricInfo, LyricLine, DynamicWordInfo, PureLyricInfo, ParseLyricProps } from './types'
import { EMPTY_DYNAMIC_WORD, EMPTY_LYRIC_LINE } from './constant'
import { calcSimularity, isEnglishSentense, replaceChineseSymbolsToEnglish } from '@root/utils'

const REGEXP = {
  OFFSET: /\[offset:(?<value>[0-9]+)]/,
  SYMBOL: /[\,\.\，\。\!\?\？\、\；\：\…\—\~\～\·\‘\’\“\”\ﾞ]/,
  EMGLISH_WORD: /[a-zA-Z]+(\'\‘\’)*[a-zA-Z]*/,
  CJK: /([\p{Unified_Ideograph}|\u3040-\u309F|\u30A0-\u30FF])/gu,
  SPACE_END: /\s$/,
  DYNAMIC_LINE: /^\[((?<min>[0-9]+):)?(?<sec>[0-9]+([\.:]([0-9]+))?)\](?<line>.*)/,
  DYNAMIC_LINE_WORD: /^\<(?<time>[0-9]+),(?<duration>[0-9]+)\>(?<word>[^\<]*)/,
  TIME: /^\[((?<min>[0-9]+):)?(?<sec>[0-9]+([\.:]([0-9]+))?)\]/,
} as const

const parseLyricTime = (minute: string, second: string) => {
  const min = Number(minute) || 0
  const sec = Number(second.replace(/:/g, '.')) || 0
  return Math.floor((min * 60 + sec) * 1000)
}

const parseUnsyncedLyrics = (lyric: string) => {
  const result: PureLyricInfo['lines'] = []
  for (const line of lyric.split('\n')) {
    const lyric = line.trim()
    if (!lyric.length) continue
    result.push({ time: 0, lyric })
  }
  return result
}

// 预处理歌词
const preProcessLyric = (lyric: string) => {
  const lines: PureLyricInfo['lines'] = []

  for (const line of lyric.split('\n')) {
    let lyric = line.trim()
    const timestamps: number[] = []
    while (true) {
      const matches = lyric.match(REGEXP.TIME)
      if (!matches) break
      timestamps.push(parseLyricTime(matches.groups?.min || '0', matches.groups?.sec || '0'))
      lyric = lyric.slice(0, matches.index) + lyric.slice((matches.index || 0) + matches[0].length)
      lyric = lyric.trim()
    }
    lyric = lyric.trim()
    for (const time of timestamps) lines.push({ time, lyric })
  }

  const result: PureLyricInfo = {
    canAutoScroll: true,
    offset: 0,
    lines: lines.sort((a, b) => a.time - b.time),
  }
  if (lines.length === 0 && lyric.trim().length > 0) {
    result.canAutoScroll = false
    result.lines = parseUnsyncedLyrics(lyric)
    return result
  }

  const offsetMatchs = lyric.match(REGEXP.OFFSET)
  if (offsetMatchs) {
    const offset = parseInt(offsetMatchs?.groups?.value || '')
    if (!isNaN(offset)) result.offset = offset
  }

  return result
}
// 预处理动态歌词
const preProcessDynamicLyric = (lyric: string) => {
  const result: LyricLine[] = []

  for (const line of lyric.trim().split('\n')) {
    let tempLine = line.trim()

    const lineMatches = tempLine.match(REGEXP.DYNAMIC_LINE)
    if (!lineMatches) continue

    tempLine = lineMatches.groups?.line || ''
    const timestamp = parseLyricTime(lineMatches.groups?.min || '0', lineMatches.groups?.sec || '0')
    const words: DynamicWordInfo[] = []

    while (tempLine.length > 0) {
      const wordMatches = tempLine.match(REGEXP.DYNAMIC_LINE_WORD)
      if (!wordMatches) break

      const wordTime = timestamp + parseInt(wordMatches.groups?.time || '0')
      const wordDuration = parseInt(wordMatches.groups?.duration || '0')
      const word = wordMatches.groups?.word

      tempLine = tempLine.slice(wordMatches.index || 0 + wordMatches[0].length)

      if (!word) continue
      // 某些单词内容为空格，给上一个单词补一个空格
      if (!word.trim()) {
        const lastWord = words[words.length - 1]
        lastWord.text += ' '
        continue
      }

      // 有些歌词一个单词还是一个句子的就离谱
      const splited = word
        .trimStart()
        .split(/\s+/)
        .filter(v => v.trim().length > 0)
      const splitedDuration = wordDuration / splited.length
      splited.forEach((subWord, i) => {
        if (i === splited.length - 1) {
          if (/\s/.test((word ?? '')[(word ?? '').length - 1])) {
            words.push({
              time: wordTime + i * splitedDuration,
              duration: splitedDuration,
              text: `${subWord.trimStart()} `,
              config: EMPTY_DYNAMIC_WORD['config'],
            })
          } else {
            words.push({
              time: wordTime + i * splitedDuration,
              duration: splitedDuration,
              text: subWord.trimStart(),
              config: EMPTY_DYNAMIC_WORD['config'],
            })
          }
        } else if (i === 0) {
          if (/\s/.test((word ?? '')[0])) {
            words.push({
              time: wordTime + i * splitedDuration,
              duration: splitedDuration,
              text: ` ${subWord.trimStart()}`,
              config: EMPTY_DYNAMIC_WORD['config'],
            })
          } else {
            words.push({
              time: wordTime + i * splitedDuration,
              duration: splitedDuration,
              text: subWord.trimStart(),
              config: EMPTY_DYNAMIC_WORD['config'],
            })
          }
        } else {
          words.push({
            time: wordTime + i * splitedDuration,
            duration: splitedDuration,
            text: `${subWord.trimStart()} `,
            config: EMPTY_DYNAMIC_WORD['config'],
          })
        }
      })
    }

    result.push({
      time: timestamp,
      duration: words.map(v => v.duration).reduce((a, b) => a + b, 0),
      content: { original: words.map(v => v.text).join(''), dynamic: { time: timestamp, words } },
      config: {
        isInterlude: false,
        isNotSupportAutoScrollTip: false,
      },
    })
  }

  return result.sort((a, b) => a.time - b.time)
}

// 处理歌词，去除一些太短的空格间曲段，并为前摇太长的歌曲加前导空格
const processLyric = (lines: LyricLine[]): LyricLine[] => {
  // if (lyric.length > 0 && lyric[lyric.length - 1].time === 5940000 && lyric[lyric.length - 1].duration === 0) {
  //   // 纯音乐
  //   return PURE_MUSIC_LYRIC_LINE
  // }

  const result: LyricLine[] = []

  let isSpace = false
  lines.forEach((current, i) => {
    if (current.content.original.trim().length === 0) {
      const next = lines[i + 1]
      if (next && next.time - current.time > 5000 && !isSpace) {
        result.push(current)
        isSpace = true
      }
    } else {
      isSpace = false
      result.push(current)
    }
  })

  while (result[0]?.content.original.length === 0) {
    result.shift()
  }

  if (result[0]?.time > 5000) {
    result.unshift({
      time: 500,
      duration: result[0]?.time - 500,
      content: { original: '' },
      config: {
        isInterlude: true,
        isNotSupportAutoScrollTip: false,
      },
    })
  }

  for (let i = 0; i < result.length; i++) {
    const current = result[i]
    // 标记原文为空的句子为间奏
    if (current.content.original.length === 0) current.config.isInterlude = true
    // 在英文句子中转化中文引号到英文分割号，中文标点到英文标点
    if (!isEnglishSentense(current?.content.original)) continue
    if (current?.content.dynamic?.words) {
      for (let j = 0; j < current.content.dynamic?.words.length; j++) {
        current.content.dynamic.words[j].text = replaceChineseSymbolsToEnglish(current.content.dynamic?.words[j].text)
      }
    }
    if (current?.content.original) {
      current.content.original = replaceChineseSymbolsToEnglish(current.content.original)
    }
  }

  return result
}

export class LyricParser {
  private isShowNotSupportAutoScrollTipLine: boolean

  constructor(isShowNotSupportAutoScrollTipLine = false) {
    this.isShowNotSupportAutoScrollTipLine = isShowNotSupportAutoScrollTipLine
  }

  private parseDynamicLyric({ original = '', translated = '', roman = '', dynamic = '' }: ParseLyricProps) {
    const preDynamic = preProcessDynamicLyric(dynamic)
    const preOriginal = preProcessLyric(original)

    const attachOriginalLyric = (lines: PureLyricInfo['lines']) => {
      const lyricTimeSet = new Set(lines.map(v => v.time))
      const originalLyricTimeSet = new Set(preOriginal.lines.map(v => v.time))
      const intersection = new Set([...lyricTimeSet].filter(v => originalLyricTimeSet.has(v)))

      const attachMatchingMode = intersection.size / lyricTimeSet.size < 0.1 ? 'closest' : 'equal'
      for (const line of preOriginal.lines) {
        let target: PureLyricInfo['lines'][number] | null = null
        if (attachMatchingMode === 'equal') {
          target = Lodash.findLast(lines, v => Math.abs(v.time - line.time) < 20)!
        } else {
          lines.forEach(v => {
            if (target) {
              if (Math.abs(target.time - line.time) > Math.abs(v.time - line.time)) target = v
            } else target = v
          })
        }
        if (target) {
          target.originalLyric = target.originalLyric || ''
          if (target.originalLyric.length > 0) target.originalLyric += ' '
          target.originalLyric += line.lyric
        }
      }

      return lines
    }
    const attachLyricToDynamic = (
      lines: PureLyricInfo['lines'],
      field: keyof Omit<LyricLine['content'], 'dynamic'>
    ) => {
      for (const line of lines) {
        let targetIndex = 0
        preDynamic.forEach((v, index) => {
          if (Math.abs(preDynamic[targetIndex].time - line.time) > Math.abs(v.time - line.time)) targetIndex = index
        })

        let sequence = [targetIndex]
        for (let offset = 1; offset <= 5; offset++) {
          if (targetIndex - offset >= 0) sequence.push(targetIndex - offset)
          if (targetIndex + offset < preDynamic.length) sequence.push(targetIndex + offset)
        }
        sequence = sequence.reverse()

        let minWeight = 1000000000
        for (let index of sequence) {
          const v = preDynamic[index]
          const similarity = calcSimularity(line.originalLyric!, v.content.original)
          const weight = similarity * 1000 + (v.content[field] ? 1 : 0)
          if (weight < minWeight) {
            minWeight = weight
            targetIndex = index
          }
        }

        const target = preDynamic[targetIndex]
        target.content[field] = target.content[field] || ''
        if (target.content[field]!.length > 0) target.content[field] += ' '
        target.content[field] += line.lyric
      }
    }

    const pureTranslated = attachOriginalLyric(preProcessLyric(translated).lines)
    attachLyricToDynamic(pureTranslated, 'translated')

    const pureRoman = attachOriginalLyric(preProcessLyric(roman).lines)
    attachLyricToDynamic(pureRoman, 'roman')

    //同步原文空格到逐字
    for (let i = 0; i < preDynamic.length; i++) {
      const line = preDynamic[i]
      const dynamic = line.content.dynamic?.words || []
      let raw = line.content.original?.trim() ?? ''
      for (let j = 0; j < dynamic.length; j++) {
        const word = dynamic[j].text.trimEnd()

        if (raw.startsWith(word)) raw = raw.substring(word.length)
        else break

        const match = raw.match(/^\s+/)
        if (match) {
          raw = raw.substring(match[0].length)
          if (!dynamic[j].text.match(/\s$/)) dynamic[j].text += ' '
        }
      }
    }

    // 标记 CJK 字符和是否空格结尾
    for (let i = 0; i < preDynamic.length; i++) {
      const thisLine = preDynamic[i]
      const dynamic = thisLine.content.dynamic?.words || []
      for (let j = 0; j < dynamic.length; j++) {
        const isCjk = !!dynamic[j]?.text?.match(REGEXP.CJK)
        const isSpaceEnd = !!dynamic[j]?.text?.match(REGEXP.SPACE_END)
        dynamic[j].config = { ...dynamic[j].config, isCjk, isSpaceEnd }
      }
    }

    // 标记尾部拖长音
    // 尾部或每个空格之前的第一个非特殊符号字符，长度超过 1 秒
    for (let i = 0; i < preDynamic.length; i++) {
      const thisLine = preDynamic[i]
      const dynamic = thisLine.content.dynamic?.words || []

      const indexes: number[] = [-1]
      for (let j = 0; j < dynamic.length - 1; j++) {
        if (dynamic[j]?.config.isSpaceEnd || dynamic[j]?.text?.match(REGEXP.SYMBOL)) {
          if (!dynamic[j]?.text?.match(REGEXP.EMGLISH_WORD)) indexes.push(j)
        }
      }
      indexes.push(dynamic.length - 1)

      for (let j = indexes.length - 1; j >= 1; j--) {
        let index: number | null = null
        for (let k = indexes[j]; k > indexes[j - 1]; k--) {
          const word = dynamic[k].text.trim()
          if (word.match(/[\p{P}\p{S}]/gu)) continue
          if (word.match(/^\s*$/)) continue
          index = k
          break
        }
        if (index === null) continue
        const target = dynamic[index]
        if (target.duration >= 1000) {
          target.config = { ...target.config, needTrailing: true }
        }
      }
    }

    const result: LyricInfo = {
      lines: processLyric(preDynamic),
      config: {
        canAutoScroll: preOriginal.canAutoScroll,
        isPureMusic: false,
        offset: preOriginal.offset,
      },
    }
    return result
  }
  private parseLyric({ original = '', translated = '', roman = '' }: ParseLyricProps) {
    const preLyric = preProcessLyric(original)
    const preLines = preLyric.lines.map(v => ({
      time: v.time,
      duration: 0,
      content: {
        original: v.lyric,
      },
      config: {
        isInterlude: false,
        isNotSupportAutoScrollTip: false,
      },
    }))
    const preInfo: LyricInfo = {
      lines: preLines,
      config: {
        canAutoScroll: preLyric.canAutoScroll,
        isPureMusic: false,
        offset: preLyric.offset,
      },
    }

    preProcessLyric(translated).lines.forEach(line => {
      const target = preInfo.lines.find(v => v.time === line.time)
      if (target) target.content.translated = line.lyric
    })
    preProcessLyric(roman).lines.forEach(line => {
      const target = preInfo.lines.find(v => v.time === line.time)
      if (target) target.content.roman = line.lyric
    })

    preInfo.lines.sort((a, b) => a.time - b.time)

    const processedLyric = processLyric(preInfo.lines)
    for (let i = 0; i < processedLyric.length; i++) {
      if (i < processedLyric.length - 1) {
        processedLyric[i].duration = processedLyric[i + 1].time - processedLyric[i].time
      }
    }

    const result: LyricInfo = { ...preInfo }
    result.lines = processLyric(preInfo.lines)
    if (!result.config.canAutoScroll && this.isShowNotSupportAutoScrollTipLine) {
      const line = Lodash.merge(EMPTY_LYRIC_LINE, { config: { isNotSupportAutoScrollTip: true } })
      result.lines.unshift(line)
    }

    return result
  }

  parse(props: ParseLyricProps): LyricInfo {
    if (props?.dynamic?.trim().length) return this.parseDynamicLyric(props)
    else return this.parseLyric(props)
  }
}
