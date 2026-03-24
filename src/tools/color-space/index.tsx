import { useState, useCallback, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useClipboard } from '@/hooks/useClipboard'
import { meta } from './meta'

interface RGB { r: number; g: number; b: number }
interface HSL { h: number; s: number; l: number }
interface HSV { h: number; s: number; v: number }
interface CMYK { c: number; m: number; y: number; k: number }

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

function hexToRgb(hex: string): RGB | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!match) return null
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  }
}

function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  
  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) }
  }
  
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  
  let h = 0
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    case b: h = ((r - g) / d + 4) / 6; break
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360
  const s = hsl.s / 100
  const l = hsl.l / 100
  
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  
  return {
    r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1/3) * 255),
  }
}

function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max
  
  if (max !== min) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  }
}

function hsvToRgb(hsv: HSV): RGB {
  const h = hsv.h / 360
  const s = hsv.s / 100
  const v = hsv.v / 100
  
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  
  let r = 0, g = 0, b = 0
  
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

function rgbToCmyk(rgb: RGB): CMYK {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  
  const k = 1 - Math.max(r, g, b)
  
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 }
  }
  
  const c = (1 - r - k) / (1 - k)
  const m = (1 - g - k) / (1 - k)
  const y = (1 - b - k) / (1 - k)
  
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  }
}

function cmykToRgb(cmyk: CMYK): RGB {
  const c = cmyk.c / 100
  const m = cmyk.m / 100
  const y = cmyk.y / 100
  const k = cmyk.k / 100
  
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k)),
  }
}

export default function ColorSpaceConverter() {
  const [rgb, setRgb] = useState<RGB>({ r: 66, g: 135, b: 245 })
  const { copy, copied } = useClipboard()

  const hex = useMemo(() => rgbToHex(rgb), [rgb])
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb])
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb])
  const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb])

  const updateRgb = useCallback((key: keyof RGB, value: number) => {
    setRgb(prev => ({ ...prev, [key]: clamp(value, 0, 255) }))
  }, [])

  const updateHex = useCallback((value: string) => {
    const newRgb = hexToRgb(value)
    if (newRgb) setRgb(newRgb)
  }, [])

  const updateHsl = useCallback((key: keyof HSL, value: number) => {
    const newHsl: HSL = { ...hsl, [key]: clamp(value, key === 'h' ? 0 : 0, key === 'h' ? 360 : 100) }
    setRgb(hslToRgb(newHsl))
  }, [hsl])

  const updateHsv = useCallback((key: keyof HSV, value: number) => {
    const newHsv: HSV = { ...hsv, [key]: clamp(value, key === 'h' ? 0 : 0, key === 'h' ? 360 : 100) }
    setRgb(hsvToRgb(newHsv))
  }, [hsv])

  const updateCmyk = useCallback((key: keyof CMYK, value: number) => {
    const newCmyk: CMYK = { ...cmyk, [key]: clamp(value, 0, 100) }
    setRgb(cmykToRgb(newCmyk))
  }, [cmyk])

  const reset = () => {
    setRgb({ r: 66, g: 135, b: 245 })
  }

  const colorFormats = useMemo(() => [
    { label: 'HEX', value: hex.toUpperCase() },
    { label: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
    { label: 'RGBA', value: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)` },
    { label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
    { label: 'HSV', value: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)` },
    { label: 'CMYK', value: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)` },
  ], [hex, rgb, hsl, hsv, cmyk])

  return (
    <ToolLayout meta={meta} onReset={reset}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="h-32 rounded-xl border border-border-base flex items-center justify-center"
          style={{ backgroundColor: hex }}
        >
          <span
            className="text-lg font-mono font-bold px-3 py-1 rounded"
            style={{ color: hsl.l > 50 ? '#000' : '#fff', backgroundColor: hsl.l > 50 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}
          >
            {hex.toUpperCase()}
          </span>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {colorFormats.map(format => (
            <div key={format.label} className="p-2 rounded-lg bg-bg-surface border border-border-base">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted">{format.label}</span>
                <button
                  onClick={() => copy(format.value)}
                  className="p-1 rounded hover:bg-bg-raised"
                >
                  {copied ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3 text-text-muted" />}
                </button>
              </div>
              <code className="text-xs font-mono text-text-primary break-all">{format.value}</code>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <div className="p-4 rounded-xl bg-bg-surface border border-border-base">
          <h3 className="text-sm font-medium text-text-primary mb-3">RGB</h3>
          <div className="space-y-3">
            {(['r', 'g', 'b'] as const).map(key => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-text-muted uppercase">{key}</label>
                  <span className="text-xs font-mono text-text-secondary">{rgb[key]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={rgb[key]}
                  onChange={e => updateRgb(key, parseInt(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-base">
          <h3 className="text-sm font-medium text-text-primary mb-3">HSL</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-text-muted uppercase">H (色相)</label>
                <span className="text-xs font-mono text-text-secondary">{hsl.h}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={hsl.h}
                onChange={e => updateHsl('h', parseInt(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-text-muted uppercase">S (饱和度)</label>
                <span className="text-xs font-mono text-text-secondary">{hsl.s}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={hsl.s}
                onChange={e => updateHsl('s', parseInt(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-text-muted uppercase">L (亮度)</label>
                <span className="text-xs font-mono text-text-secondary">{hsl.l}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={hsl.l}
                onChange={e => updateHsl('l', parseInt(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-base">
          <h3 className="text-sm font-medium text-text-primary mb-3">HSV</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-text-muted uppercase">H (色相)</label>
                <span className="text-xs font-mono text-text-secondary">{hsv.h}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={hsv.h}
                onChange={e => updateHsv('h', parseInt(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-text-muted uppercase">S (饱和度)</label>
                <span className="text-xs font-mono text-text-secondary">{hsv.s}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={hsv.s}
                onChange={e => updateHsv('s', parseInt(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-text-muted uppercase">V (明度)</label>
                <span className="text-xs font-mono text-text-secondary">{hsv.v}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={hsv.v}
                onChange={e => updateHsv('v', parseInt(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-base">
          <h3 className="text-sm font-medium text-text-primary mb-3">CMYK</h3>
          <div className="space-y-3">
            {(['c', 'm', 'y', 'k'] as const).map(key => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-text-muted uppercase">{key}</label>
                  <span className="text-xs font-mono text-text-secondary">{cmyk[key]}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={cmyk[key]}
                  onChange={e => updateCmyk(key, parseInt(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 rounded-xl bg-bg-surface border border-border-base">
        <h3 className="text-sm font-medium text-text-primary mb-3">HEX 输入</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={hex}
            onChange={e => updateHex(e.target.value)}
            placeholder="#4287f5"
            className="flex-1 px-4 py-2 rounded-lg bg-bg-raised border border-border-base text-text-primary font-mono text-sm focus:outline-none focus:border-accent"
          />
          <input
            type="color"
            value={hex}
            onChange={e => updateHex(e.target.value)}
            className="w-12 h-10 rounded-lg cursor-pointer border border-border-base"
          />
        </div>
      </div>
    </ToolLayout>
  )
}
