import { useState, useMemo, useCallback } from 'react'
import { ArrowLeftRight, Copy, Check, Info } from 'lucide-react'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useClipboard } from '@/hooks/useClipboard'
import { meta } from './meta'

type UnitSystem = 'si' | 'binary'

interface StorageUnit {
  name: string
  symbol: string
  siBase: number
  binaryBase: number
}

const STORAGE_UNITS: StorageUnit[] = [
  { name: 'Bit', symbol: 'b', siBase: 0.125, binaryBase: 0.125 },
  { name: 'Byte', symbol: 'B', siBase: 1, binaryBase: 1 },
  { name: 'Kilobyte', symbol: 'KB', siBase: 1000, binaryBase: 1024 },
  { name: 'Megabyte', symbol: 'MB', siBase: 1000000, binaryBase: 1048576 },
  { name: 'Gigabyte', symbol: 'GB', siBase: 1000000000, binaryBase: 1073741824 },
  { name: 'Terabyte', symbol: 'TB', siBase: 1000000000000, binaryBase: 1099511627776 },
  { name: 'Petabyte', symbol: 'PB', siBase: 1000000000000000, binaryBase: 1125899906842624 },
  { name: 'Exabyte', symbol: 'EB', siBase: 1e18, binaryBase: 1152921504606847000 },
]

function convertStorage(value: number, fromUnit: string, toUnit: string, system: UnitSystem): number {
  const from = STORAGE_UNITS.find(u => u.symbol === fromUnit)
  const to = STORAGE_UNITS.find(u => u.symbol === toUnit)
  
  if (!from || !to) return NaN
  
  const fromBase = system === 'si' ? from.siBase : from.binaryBase
  const toBase = system === 'si' ? to.siBase : to.binaryBase
  
  const bytes = value * fromBase
  return bytes / toBase
}

function formatNumber(num: number): string {
  if (isNaN(num) || !isFinite(num)) return '-'
  
  if (Math.abs(num) < 0.000001) {
    return num.toExponential(4)
  }
  
  if (Math.abs(num) >= 1e15) {
    return num.toExponential(4)
  }
  
  if (Number.isInteger(num)) {
    return num.toLocaleString()
  }
  
  const str = num.toPrecision(8)
  return parseFloat(str).toLocaleString(undefined, { maximumFractionDigits: 8 })
}

function formatWithUnit(num: number, unit: string): string {
  return `${formatNumber(num)} ${unit}`
}

function findBestUnit(bytes: number, system: UnitSystem): { value: number; unit: StorageUnit } {
  const units = system === 'si' 
    ? STORAGE_UNITS.slice(1).reverse()
    : STORAGE_UNITS.slice(1).reverse()
  
  for (const unit of units) {
    const base = system === 'si' ? unit.siBase : unit.binaryBase
    if (bytes >= base) {
      return { value: bytes / base, unit }
    }
  }
  
  return { value: bytes, unit: STORAGE_UNITS[1] }
}

export default function DataStorageConverter() {
  const [inputValue, setInputValue] = useState('1')
  const [fromUnit, setFromUnit] = useState('GB')
  const [toUnit, setToUnit] = useState('MB')
  const [system, setSystem] = useState<UnitSystem>('binary')
  const { copy, copied } = useClipboard()

  const result = useMemo(() => {
    const value = parseFloat(inputValue)
    if (isNaN(value)) return null
    return convertStorage(value, fromUnit, toUnit, system)
  }, [inputValue, fromUnit, toUnit, system])

  const bytesValue = useMemo(() => {
    const value = parseFloat(inputValue)
    if (isNaN(value)) return null
    const from = STORAGE_UNITS.find(u => u.symbol === fromUnit)
    if (!from) return null
    return value * (system === 'si' ? from.siBase : from.binaryBase)
  }, [inputValue, fromUnit, system])

  const bestFit = useMemo(() => {
    if (bytesValue === null) return null
    return findBestUnit(bytesValue, system)
  }, [bytesValue, system])

  const allConversions = useMemo(() => {
    const value = parseFloat(inputValue)
    if (isNaN(value)) return []
    
    return STORAGE_UNITS.map(unit => ({
      unit,
      value: convertStorage(value, fromUnit, unit.symbol, system),
    }))
  }, [inputValue, fromUnit, system])

  const swapUnits = useCallback(() => {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
  }, [fromUnit, toUnit])

  const reset = () => {
    setInputValue('1')
    setFromUnit('GB')
    setToUnit('MB')
    setSystem('binary')
  }

  return (
    <ToolLayout meta={meta} onReset={reset}>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">单位制:</span>
          <button
            onClick={() => setSystem('si')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              system === 'si'
                ? 'bg-accent text-bg-base'
                : 'bg-bg-surface text-text-secondary hover:bg-bg-raised border border-border-base'
            }`}
          >
            SI (1000)
          </button>
          <button
            onClick={() => setSystem('binary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              system === 'binary'
                ? 'bg-accent text-bg-base'
                : 'bg-bg-surface text-text-secondary hover:bg-bg-raised border border-border-base'
            }`}
          >
            二进制 (1024)
          </button>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <Info className="w-3 h-3" />
          <span>
            {system === 'si' 
              ? 'SI: 1 KB = 1000 B (国际标准)'
              : '二进制: 1 KiB = 1024 B (传统计算)'}
          </span>
        </div>
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
            placeholder="输入数值"
            className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-base text-text-primary text-lg font-mono focus:outline-none focus:border-accent"
          />
          <select
            value={fromUnit}
            onChange={e => setFromUnit(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-base text-text-primary focus:outline-none focus:border-accent"
          >
            {STORAGE_UNITS.map(unit => (
              <option key={unit.symbol} value={unit.symbol}>
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
              {result !== null ? formatWithUnit(result, toUnit) : '-'}
            </div>
            {result !== null && (
              <button
                onClick={() => copy(formatWithUnit(result, toUnit))}
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
            {STORAGE_UNITS.map(unit => (
              <option key={unit.symbol} value={unit.symbol}>
                {unit.name} ({unit.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      {bytesValue !== null && bestFit && (
        <div className="mt-4 p-4 rounded-xl bg-bg-surface border border-border-base">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-text-muted">等价于</span>
              <span className="ml-2 text-lg font-mono text-text-primary">
                {formatWithUnit(bestFit.value, bestFit.unit.symbol)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-muted">字节数</span>
              <span className="ml-2 font-mono text-text-secondary">
                {formatNumber(bytesValue)} B
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl bg-bg-surface border border-border-base">
        <h3 className="text-sm font-medium text-text-primary mb-3">全部单位换算</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {allConversions.map(({ unit, value }) => (
            <div
              key={unit.symbol}
              className={`p-2 rounded-lg text-sm ${
                unit.symbol === toUnit
                  ? 'bg-accent/10 border border-accent/20'
                  : 'bg-bg-raised border border-border-base'
              }`}
            >
              <div className="text-text-muted text-xs mb-0.5">{unit.name}</div>
              <div className="font-mono text-text-primary text-sm">
                {value !== null ? formatNumber(value) : '-'}
                <span className="text-text-muted ml-1">{unit.symbol}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  )
}
