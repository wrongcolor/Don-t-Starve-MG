// Reads PORT from the environment directly instead of relying on shell parameter
// expansion (npm on Windows runs scripts via cmd.exe, which doesn't support
// `${PORT:-3000}`) so the same start command works locally and on Railway.
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const port = process.env.PORT || '3000'
const distPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')

const child = spawn('npx', ['serve', '-s', distPath, '-l', port], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('exit', (code) => process.exit(code ?? 0))
