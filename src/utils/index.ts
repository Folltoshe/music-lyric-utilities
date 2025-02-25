import { Functions } from '@root/variable'

export const EMPTY_CALLBACK = () => {}

export const isEnglishSentense = (str: string) => {
  if (str.replace(/[\p{P}\p{S}]/gu, '').match(/^[\s\w\u00C0-\u024F]+$/u)) return true
  return false
}

const CHINESE_SYMBOLS_MAP: [RegExp, string][] = [
  [/[‘’′]/g, "'"],
  [/[“”′′]/g, '"'],
  [/[（]/g, '('],
  [/[）]/g, ')'],
  [/[，]/g, ','],
  [/[！]/g, '!'],
  [/[？]/g, '?'],
  [/[：]/g, ':'],
  [/[;]/g, ';'],
]
export const replaceChineseSymbolsToEnglish = (str: string) => {
  for (const [regexp, replace] of CHINESE_SYMBOLS_MAP) str = str.replace(regexp, replace)
  return str
}

export const handleGetNow = () => Functions.Time.now()

export class TimeoutTools {
  private invokeTime: number = 0
  private animationFrameId: number | null = null
  private timeoutId: null | ReturnType<typeof Functions.Time.setTimeout> = null
  private callback: ((diff: number) => void) | null = null
  private thresholdTime: number = 200

  private run() {
    this.animationFrameId = Functions.Animation.requestAnimationFrame(() => {
      this.animationFrameId = null
      let diff = this.invokeTime - handleGetNow()
      if (diff > 0) {
        if (diff < this.thresholdTime) {
          this.run()
          return
        }
        this.timeoutId = Functions.Time.setTimeout(() => {
          this.timeoutId = null
          this.run()
        }, diff - this.thresholdTime)
        return
      }

      this.callback && this.callback(diff)
    })
  }

  start(callback = EMPTY_CALLBACK, timeout = 0) {
    this.callback = callback
    this.invokeTime = handleGetNow() + timeout
    this.run()
  }

  clear() {
    if (this.animationFrameId) {
      Functions.Animation.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    if (this.timeoutId) {
      Functions.Time.clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    this.callback = null
  }
}

export const calcSimularity = (a: string, b: string) => {
  if (typeof a === 'undefined') a = ''
  if (typeof b === 'undefined') b = ''
  const m = a.length
  const n = b.length
  const d: number[][] = []
  for (let i = 0; i <= m; i++) {
    d[i] = []
    d[i][0] = i
  }
  for (let j = 0; j <= n; j++) {
    d[0][j] = j
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        d[i][j] = d[i - 1][j - 1]
      } else {
        d[i][j] = Math.min(d[i - 1][j - 1] + 1, d[i][j - 1] + 1, d[i - 1][j] + 1)
      }
    }
  }
  return d[m][n]
}
