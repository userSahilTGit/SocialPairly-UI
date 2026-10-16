/**
 * Start Vite without going through `npm run`, and strip unknown npm_* env
 * keys (e.g. npm_config_devdir from the IDE) that trigger npm warnings.
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

const env = { ...process.env }
for (const key of Object.keys(env)) {
  if (/^npm_config_/i.test(key) && /devdir/i.test(key)) {
    delete env[key]
  }
}

const child = spawn(process.execPath, [viteBin, ...process.argv.slice(2)], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: false,
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
