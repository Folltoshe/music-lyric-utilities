import Path from 'node:path'
import { defineConfig } from 'vite'

const SourceRoot = Path.join(process.cwd(), 'src')

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: Path.join(SourceRoot, 'index.ts'),
      name: 'MusicLyricUtilities',
      formats: ['cjs', 'iife', 'es'],
      fileName: 'music-lyric-utilities',
    },
    minify: false,
  },
  resolve: {
    alias: {
      '@root': SourceRoot,
    },
  },
})
