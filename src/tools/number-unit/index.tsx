import { useState, useCallback, useMemo } from 'react'
import { ArrowLeftRight, Copy, Check } from 'lucide-react'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useClipboard } from '@/hooks/useClipboard'
import { meta } from './meta'

type UnitCategory = 'length' | 'weight' | 'temperature' | 'speed' | 'area' | 'volume' | 'time' | 'pressure'

interface UnitDefinition {
  name: string
  symbol: string
  toBase: number
}

interface CategoryDefinition {
  label: string
  baseUnit: string
  units: Record<string, UnitDefinition>
}

const CATEGORIES: Record<UnitCategory, CategoryDefinition> = {
  length: {
    label: '长度',
    baseUnit: 'm',
    units: {
      km: { name: '千米', symbol: 'km', toBase: 1000 },
      m: { name: '米', symbol: 'm', toBase: 1 },
      cm: { name: '厘米', symbol: 'cm', toBase: 0.01 },
      mm: { name: '毫米', symbol: 'mm', toBase: 0.001 },
      mi: { name: '英里', symbol: 'mi', toBase: 1609.344 },
      yd: { name: '码', symbol: 'yd', toBase: 0.9144 },
      ft: { name: '英尺', symbol: 'ft', toBase: 0.3048 },
      in: { name: '英寸', symbol: 'in', toBase: 0.0254 },
      nm: { name: '海里', symbol: 'nm', toBase: 1852 },
    },
  },
  weight: {
    label: '重量',
    baseUnit: 'kg',
    units: {
      t: { name: '吨', symbol: 't', toBase: 1000 },
      kg: { name: '千克', symbol: 'kg', toBase: 1 },
      g: { name: '克', symbol: 'g', toBase: 0.001 },
      mg: { name: '毫克', symbol: 'mg', toBase: 0.000001 },
      lb: { name: '磅', symbol: 'lb', toBase: 0.453592 },
      oz: { name: '盎司', symbol: 'oz', toBase: 0.0283495 },
      jin: { name: '斤', symbol: '斤', toBase: 0.5 },
      liang: { name: '两', symbol: '两', toBase: 0.05 },
    },
  },
  temperature: {
    label: '温度',
    baseUnit: 'c',
    units: {
      c: { name: '摄氏度', symbol: '°C', toBase: 1 },
      f: { name: '华氏度', symbol: '°F', toBase: 1 },
      k: { name: '开尔文', symbol: 'K', toBase: 1 },
    },
  },
  speed: {
    label: '速度',
    baseUnit: 'm/s',
    units: {
      'm/s': { name: '米/秒', symbol: 'm/s', toBase: 1 },
      'km/h': { name: '千米/时', symbol: 'km/h', toBase: 0.277778 },
      mph: { name: '英里/时', symbol: 'mph', toBase: 0.44704 },
      kn: { name: '节', symbol: 'kn', toBase: 0.514444 },
      'ft/s': { name: '英尺/秒', symbol: 'ft/s', toBase: 0.3048 },
      mach: { name: '马赫', symbol: 'Ma', toBase: 340.29 },
    },
  },
  area: {
    label: '面积',
    baseUnit: 'm2',
    units: {
      km2: { name: '平方千米', symbol: 'km²', toBase: 1000000 },
      m2: { name: '平方米', symbol: 'm²', toBase: 1 },
      cm2: { name: '平方厘米', symbol: 'cm²', toBase: 0.0001 },
      ha: { name: '公顷', symbol: 'ha', toBase: 10000 },
      acre: { name: '英亩', symbol: 'acre', toBase: 4046.86 },
      ft2: { name: '平方英尺', symbol: 'ft²', toBase: 0.092903 },
      mu: { name: '亩', symbol: '亩', toBase: 666.667 },
    },
  },
  volume: {
    label: '体积',
    baseUnit: 'L',
    units: {
      m3: { name: '立方米', symbol: 'm³', toBase: 1000 },
      L: { name: '升', symbol: 'L', toBase: 1 },
      mL: { name: '毫升', symbol: 'mL', toBase: 0.001 },
      gal: { name: '加仑(美)', symbol: 'gal', toBase: 3.78541 },
      qt: { name: '夸脱', symbol: 'qt', toBase: 0.946353 },
      pt: { name: '品脱', symbol: 'pt', toBase: 0.473176 },
      cup: { name: '杯', symbol: 'cup', toBase: 0.236588 },
    },
  },
  time: {
    label: '时间',
    baseUnit: 's',
    units: {
      y: { name: '年', symbol: 'y', toBase: 31536000 },
      mo: { name: '月', symbol: 'mo', toBase: 2592000 },
      w: { name: '周', symbol: 'w', toBase: 604800 },
      d: { name: '天', symbol: 'd', toBase: 86400 },
      h: { name: '小时', symbol: 'h', toBase: 3600 },
      min: { name: '分钟', symbol: 'min', toBase: 60 },
      s: { name: '秒', symbol: 's', toBase: 1 },
      ms: { name: '毫秒', symbol: 'ms', toBase: 0.001 },
    },
  },
  pressure: {
    label: '压力',
    baseUnit: 'Pa',
    units: {
      Pa: { name: '帕斯卡', symbol: 'Pa', toBase: 1 },
      kPa: { name: '千帕', symbol: 'kPa', toBase: 1000 },
      MPa: { name: '兆帕', symbol: 'MPa', toBase: 1000000 },
      bar: { name: '巴', symbol: 'bar', toBase: 100000 },
      psi: { name: '磅/平方英寸', symbol: 'psi', toBase: 6894.76 },
      atm: { name: '标准大气压', symbol: 'atm', toBase: 101325 },
      mmHg: { name: '毫米汞柱', symbol: 'mmHg', toBase: 133.322 },
    },
  },
}

function convertTemperature(value: number, from: string, to: string): number {
  let celsius: number
  
  switch (from) {
    case 'c': celsius = value; break
    case 'f': celsius = (value - 32) * 5 / 9; break
    case 'k': celsius = value - 273.15; break
    default: return NaN
  }
  
  switch (to) {
    case 'c': return celsius
    case 'f': return celsius * 9 / 5 + 32
    case 'k': return celsius + 273.15
    default: return NaN
  }
}

function convert(value: number, from: string, to: string, category: UnitCategory): number {
  if (category === 'temperature') {
    return convertTemperature(value, from, to)
  }
  
  const cat = CATEGORIES[category]
  const fromUnit = cat.units[from]
  const toUnit = cat.units[to]
  
  if (!fromUnit || !toUnit) return NaN
  
  const baseValue = value * fromUnit.toBase
  return baseValue / toUnit.toBase
}

function formatNumber(num: number): string {
  if (isNaN(num) || !isFinite(num)) return '-'
  
  if (Math.abs(num) < 0.000001 || Math.abs(num) > 1e12) {
    return num.toExponential(6)
  }
  
  if (Number.isInteger(num)) {
    return num.toLocaleString()
  }
  
  const str = num.toPrecision(10)
  return parseFloat(str).toLocaleString(undefined, { maximumFractionDigits: 10 })
}

export default function NumberUnitConverter() {
  const [category, setCategory] = useState<UnitCategory>('length')
  const [fromUnit, setFromUnit] = useState('m')
  const [toUnit, setToUnit] = useState('km')
  const [inputValue, setInputValue] = useState('1')
  const { copy, copied } = useClipboard()

  const result = useMemo(() => {
    const value = parseFloat(inputValue)
    if (isNaN(value)) return null
    return convert(value, fromUnit, toUnit, category)
  }, [inputValue, fromUnit, toUnit, category])

  const handleCategoryChange = useCallback((newCategory: UnitCategory) => {
    setCategory(newCategory)
    const units = Object.keys(CATEGORIES[newCategory].units)
    setFromUnit(units[0])
    setToUnit(units[1] || units[0])
  }, [])

  const swapUnits = useCallback(() => {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
  }, [fromUnit, toUnit])

  const reset = () => {
    setCategory('length')
    setFromUnit('m')
    setToUnit('km')
    setInputValue('1')
  }

  const currentCategory = CATEGORIES[category]
  const units = Object.entries(currentCategory.units)

  return (
    <ToolLayout meta={meta} onReset={reset}>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(Object.entries(CATEGORIES) as [UnitCategory, CategoryDefinition][]).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => handleCategoryChange(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              category === key
                ? 'bg-accent text-bg-base'
                : 'bg-bg-surface text-text-secondary hover:bg-bg-raised border border-border-base'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="space-y-3">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider block">
            输入值
          </label>
          <input
            type="number"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-base text-text-primary text-lg font-mono focus:outline-none focus:border-accent"
            placeholder="输入数值"
          />
          <select
            value={fromUnit}
            onChange={e => setFromUnit(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-base text-text-primary focus:outline-none focus:border-accent"
          >
            {units.map(([key, unit]) => (
              <option key={key} value={key}>
                {unit.name} ({unit.symbol})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-center pt-8">
          <button
            onClick={swapUnits}
            className="p-3 rounded-xl bg-bg-surface border border-border-base hover:bg-bg-raised hover:border-accent transition-colors"
            title="交换单位"
          >
            <ArrowLeftRight className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider block">
            转换结果
          </label>
          <div className="relative">
            <div className="w-full px-4 py-3 rounded-xl bg-accent/10 border border-accent/20 text-accent text-lg font-mono min-h-[50px] flex items-center">
              {result !== null ? formatNumber(result) : '-'}
            </div>
            {result !== null && (
              <button
                onClick={() => copy(formatNumber(result))}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-accent/20 transition-colors"
                title="复制结果"
              >
                {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4 text-accent/60" />}
              </button>
            )}
          </div>
          <select
            value={toUnit}
            onChange={e => setToUnit(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-base text-text-primary focus:outline-none focus:border-accent"
          >
            {units.map(([key, unit]) => (
              <option key={key} value={key}>
                {unit.name} ({unit.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-xl bg-bg-surface border border-border-base">
        <h3 className="text-sm font-medium text-text-primary mb-3">全部单位换算</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {units.map(([key, unit]) => {
            const value = parseFloat(inputValue)
            const converted = !isNaN(value) ? convert(value, fromUnit, key, category) : null
            return (
              <div
                key={key}
                className={`p-2 rounded-lg text-sm ${
                  key === toUnit
                    ? 'bg-accent/10 border border-accent/20'
                    : 'bg-bg-raised border border-border-base'
                }`}
              >
                <div className="text-text-muted text-xs mb-0.5">{unit.name}</div>
                <div className="font-mono text-text-primary">
                  {converted !== null ? formatNumber(converted) : '-'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </ToolLayout>
  )
}
