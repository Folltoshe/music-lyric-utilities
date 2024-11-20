import { LyricParser, LyricPlayer } from '../src'
import ExampleLyric from './lyric.json'

const lyricParser = new LyricParser()
const lyricInfo = lyricParser.parse({
  original: ExampleLyric.one.original,
  translated: ExampleLyric.one.translated,
  roman: ExampleLyric.one.roman,
  dynamic: ExampleLyric.one.dynamic,
})

const player = new LyricPlayer({
  onSetLyric(info) {
    console.log('onSetLyric', info)
  },
  onLinePlay(lineNum, info) {
    console.log('onLinePlay', lineNum, info)
  },
})
player.updateLyric(lyricInfo)

player.play(217826)
