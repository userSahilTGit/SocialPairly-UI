import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { BACKEND_PORT } from '@/config/ports'

describe('shared ports', () => {
  it('keeps the deployed nginx proxy on the backend port', () => {
    const nginx = readFileSync(path.resolve(process.cwd(), 'deploy/nginx.conf'), 'utf8')
    const target = `127.0.0.1:${BACKEND_PORT}`
    expect(nginx).toContain(`${target}/api/`)
    expect(nginx).toContain(`${target}/uploads/`)
  })
})
