export interface FunctionsType {
  Time: {
    setTimeout: (handler: (...args: any[]) => any, ms?: number) => number | NodeJS.Timeout
    clearTimeout: (id: number | NodeJS.Timeout) => void
    setInterval: (handler: (...args: any[]) => any, timeout?: number) => number | NodeJS.Timeout
    clearInterval: (id: number | NodeJS.Timeout) => void
    now: () => number
  }
  Animation: {
    requestAnimationFrame: (callback: FrameRequestCallback) => number
    cancelAnimationFrame: (id: number) => void
  }
}
export const Functions: FunctionsType = {
  Time: {
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    now:
      typeof globalThis?.performance?.now === 'function'
        ? globalThis.performance.now.bind(globalThis.performance)
        : globalThis.Date.now.bind(globalThis.Date),
  },
  Animation: {
    requestAnimationFrame: globalThis.requestAnimationFrame
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : globalThis.setTimeout.bind(globalThis),
    cancelAnimationFrame: globalThis.cancelAnimationFrame
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : globalThis.clearTimeout.bind(globalThis),
  },
}
