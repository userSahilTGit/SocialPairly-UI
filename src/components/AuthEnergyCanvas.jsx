import { useEffect, useRef } from 'react'

const COLORS = ['#ff2a85', '#c084fc', '#22d3ee', '#fbbf24', '#34d399', '#fb7185', '#e879f9']
const PARTICLE_COUNT = 80
const BURST_COUNT = 45
const LINK_DIST = 120
const AVOID_PAD = 12
const AVOID_FADE = 56
/** Only opaque/readable UI — leave open gradient free for particles */
const AVOID_SELECTORS = [
  '.auth-card-design',
  '.auth-signin-card',
  '.auth-glass-card',
  '.auth-privacy-modal',
  '.auth-hero-headline',
  '.auth-hero-lead',
  '.auth-top-brand-text',
  '.auth-couple-banner',
].join(',')

/**
 * Background energy particles for auth (page0).
 * Fixed above the gradient, below UI; fades near text/cards only.
 */
export default function AuthEnergyCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const particleCount = reduceMotion ? 36 : PARTICLE_COUNT
    const enableMousePull = !reduceMotion

    let particles = []
    let burstParticles = []
    let avoidRects = []
    let animationFrameId = 0
    let running = true
    let cssW = 0
    let cssH = 0
    let dpr = 1

    const mouse = { x: 0, y: 0, isActive: false }

    const resize = () => {
      cssW = window.innerWidth
      cssH = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(cssW * dpr))
      canvas.height = Math.max(1, Math.floor(cssH * dpr))
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      refreshAvoidRects()
    }

    const refreshAvoidRects = () => {
      const root = document.querySelector('.auth-shell') || document
      avoidRects = Array.from(root.querySelectorAll(AVOID_SELECTORS)).map((el) => {
        const r = el.getBoundingClientRect()
        return {
          left: r.left - AVOID_PAD,
          top: r.top - AVOID_PAD,
          right: r.right + AVOID_PAD,
          bottom: r.bottom + AVOID_PAD,
        }
      }).filter((r) => r.right - r.left > 8 && r.bottom - r.top > 8)
    }

    const readabilityFactor = (x, y) => {
      let factor = 1
      for (let i = 0; i < avoidRects.length; i += 1) {
        const r = avoidRects[i]
        const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
        if (inside) {
          factor = Math.min(factor, 0.08)
          continue
        }
        const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0
        const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < AVOID_FADE) {
          const t = dist / AVOID_FADE
          factor = Math.min(factor, 0.08 + t * 0.92)
        }
      }
      return factor
    }

    class EnergyParticle {
      constructor() {
        this.reset(true)
      }

      reset(randomY = true) {
        this.x = Math.random() * cssW
        this.y = randomY ? Math.random() * cssH : Math.random() * cssH
        this.size = Math.random() * 4.5 + 2
        this.speedX = (Math.random() - 0.5) * (reduceMotion ? 0.3 : 0.9)
        this.speedY = (Math.random() - 0.5) * (reduceMotion ? 0.3 : 0.9)
        this.baseOpacity = Math.random() * 0.35 + 0.55
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)]
        this.pulseSpeed = Math.random() * 0.035 + 0.012
        this.phase = Math.random() * Math.PI * 2
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        if (enableMousePull && mouse.isActive) {
          const dx = mouse.x - this.x
          const dy = mouse.y - this.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const maxDistance = 200
          if (distance < maxDistance && distance > 0.001) {
            const force = (maxDistance - distance) / maxDistance
            this.x += (dx / distance) * force * 1.25
            this.y += (dy / distance) * force * 1.25
          }
        }

        if (this.x < -20) this.x = cssW + 20
        if (this.x > cssW + 20) this.x = -20
        if (this.y < -20) this.y = cssH + 20
        if (this.y > cssH + 20) this.y = -20
      }

      draw() {
        const fade = readabilityFactor(this.x, this.y)
        const pulse = 0.85 + Math.sin(Date.now() * this.pulseSpeed + this.phase) * 0.15
        const alpha = Math.max(0, Math.min(1, this.baseOpacity * pulse * fade))
        if (alpha < 0.05) return alpha

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = this.color
        ctx.shadowColor = this.color
        ctx.shadowBlur = 22 * fade
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
        // bright core
        ctx.shadowBlur = 0
        ctx.globalAlpha = Math.min(1, alpha + 0.25)
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(this.x, this.y, Math.max(1, this.size * 0.35), 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        return alpha
      }
    }

    class BurstParticle {
      constructor(x, y) {
        this.x = x
        this.y = y
        this.size = Math.random() * 5 + 2
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 7 + 2
        this.speedX = Math.cos(angle) * speed
        this.speedY = Math.sin(angle) * speed
        this.life = 1
        this.decay = Math.random() * 0.028 + 0.018
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)]
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY
        this.speedX *= 0.94
        this.speedY *= 0.94
        this.life -= this.decay
      }

      draw() {
        const fade = readabilityFactor(this.x, this.y)
        const alpha = Math.max(0, this.life * fade)
        if (alpha < 0.04) return
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = this.color
        ctx.shadowColor = this.color
        ctx.shadowBlur = 14
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    const initParticles = () => {
      particles = Array.from({ length: particleCount }, () => new EnergyParticle())
    }

    const createBurst = (x, y, count = BURST_COUNT) => {
      if (reduceMotion) return
      for (let i = 0; i < count; i += 1) burstParticles.push(new BurstParticle(x, y))
    }

    const drawLinks = () => {
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist >= LINK_DIST) continue
          const midFade = Math.min(
            readabilityFactor(a.x, a.y),
            readabilityFactor(b.x, b.y),
            readabilityFactor((a.x + b.x) / 2, (a.y + b.y) / 2),
          )
          if (midFade < 0.12) continue
          const t = 1 - dist / LINK_DIST
          ctx.save()
          ctx.globalAlpha = t * 0.45 * midFade
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
          ctx.restore()
        }
      }
    }

    let frame = 0
    const animate = () => {
      if (!running) return

      ctx.clearRect(0, 0, cssW, cssH)

      if (frame % 20 === 0) refreshAvoidRects()
      frame += 1

      particles.forEach((p) => p.update())
      drawLinks()
      particles.forEach((p) => p.draw())

      for (let i = burstParticles.length - 1; i >= 0; i -= 1) {
        const bp = burstParticles[i]
        bp.update()
        bp.draw()
        if (bp.life <= 0) burstParticles.splice(i, 1)
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    const onResize = () => resize()
    const onScroll = () => refreshAvoidRects()
    const onMouseMove = (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.isActive = true
    }
    const onMouseLeave = () => { mouse.isActive = false }
    const onClick = (e) => {
      if (e.target?.closest?.('button, a, input, textarea, select, label, .auth-card-design, .auth-privacy-modal')) return
      createBurst(e.clientX, e.clientY)
    }
    const onTouchMove = (e) => {
      const t = e.touches[0]
      if (!t) return
      mouse.x = t.clientX
      mouse.y = t.clientY
      mouse.isActive = true
    }
    const onTouchEnd = () => { mouse.isActive = false }

    mouse.x = cssW / 2
    mouse.y = cssH / 2
    resize()
    initParticles()
    animate()

    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('mousemove', onMouseMove)
    document.documentElement.addEventListener('mouseleave', onMouseLeave)
    window.addEventListener('click', onClick)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      running = false
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMouseMove)
      document.documentElement.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('click', onClick)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="auth-energy-canvas"
      aria-hidden="true"
    />
  )
}
