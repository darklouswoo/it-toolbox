import { useState, useCallback, useMemo } from 'react'
import { Copy, Check, RefreshCw } from 'lucide-react'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useClipboard } from '@/hooks/useClipboard'
import { meta } from './meta'

interface TimeFormat {
  label: string
  value: string
  description: string
}

function padZero(num: number, len: number = 2): string {
  return num.toString().padStart(len, '0')
}

function formatDateToISO8601(date: Date): string {
  return date.toISOString()
}

function formatDateToRFC2822(date: Date): string {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  const day = days[date.getUTCDay()]
  const d = padZero(date.getUTCDate())
  const month = months[date.getUTCMonth()]
  const year = date.getUTCFullYear()
  const time = `${padZero(date.getUTCHours())}:${padZero(date.getUTCMinutes())}:${padZero(date.getUTCSeconds())}`
  
  return `${day}, ${d} ${month} ${year} ${time} +0000`
}

function formatDateToHTTP(date: Date): string {
  return date.toUTCString()
}

function formatDateToSQL(date: Date): string {
  const year = date.getUTCFullYear()
  const month = padZero(date.getUTCMonth() + 1)
  const day = padZero(date.getUTCDate())
  const hours = padZero(date.getUTCHours())
  const minutes = padZero(date.getUTCMinutes())
  const seconds = padZero(date.getUTCSeconds())
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function formatDateToSQLTimestamp(date: Date): string {
  const year = date.getUTCFullYear()
  const month = padZero(date.getUTCMonth() + 1)
  const day = padZero(date.getUTCDate())
  const hours = padZero(date.getUTCHours())
  const minutes = padZero(date.getUTCMinutes())
  const seconds = padZero(date.getUTCSeconds())
  const ms = padZero(date.getUTCMilliseconds(), 3)
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`
}

function formatDateToUnixTimestamp(date: Date): string {
  return Math.floor(date.getTime() / 1000).toString()
}

function formatDateToUnixMs(date: Date): string {
  return date.getTime().toString()
}

function formatDateToExcel(date: Date): string {
  const excelEpoch = new Date(1899, 11, 30)
  const diff = date.getTime() - excelEpoch.getTime()
  return (diff / (1000 * 60 * 60 * 24)).toFixed(6)
}

function formatDateToJulian(date: Date): string {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  
  const julianDay = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
  
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const seconds = date.getUTCSeconds()
  
  const fraction = (hours + minutes / 60 + seconds / 3600) / 24
  
  return (julianDay + fraction).toFixed(8)
}

function formatDateToLocal(date: Date): string {
  return date.toLocaleString()
}

function formatDateToCustom(date: Date, format: string): string {
  const replacements: Record<string, string> = {
    'YYYY': date.getUTCFullYear().toString(),
    'YY': date.getUTCFullYear().toString().slice(-2),
    'MM': padZero(date.getUTCMonth() + 1),
    'M': (date.getUTCMonth() + 1).toString(),
    'DD': padZero(date.getUTCDate()),
    'D': date.getUTCDate().toString(),
    'HH': padZero(date.getUTCHours()),
    'H': date.getUTCHours().toString(),
    'hh': padZero(date.getUTCHours() % 12 || 12),
    'h': (date.getUTCHours() % 12 || 12).toString(),
    'mm': padZero(date.getUTCMinutes()),
    'm': date.getUTCMinutes().toString(),
    'ss': padZero(date.getUTCSeconds()),
    's': date.getUTCSeconds().toString(),
    'SSS': padZero(date.getUTCMilliseconds(), 3),
    'A': date.getUTCHours() >= 12 ? 'PM' : 'AM',
    'a': date.getUTCHours() >= 12 ? 'pm' : 'am',
  }
  
  let result = format
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key, 'g'), value)
  }
  return result
}

function parseInput(value: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed)
    if (num > 1e12 && num < 1e14) {
      return new Date(num)
    }
    if (num > 1e9 && num < 1e11) {
      return new Date(num * 1000)
    }
  }
  
  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }
  
  return null
}

export default function EpochFormats() {
  const [input, setInput] = useState('')
  const [date, setDate] = useState<Date | null>(new Date())
  const [customFormat, setCustomFormat] = useState('YYYY-MM-DD HH:mm:ss')
  const { copy, copied } = useClipboard()

  const handleInput = useCallback((value: string) => {
    setInput(value)
    if (value.trim()) {
      const parsed = parseInput(value)
      setDate(parsed)
    } else {
      setDate(null)
    }
  }, [])

  const setCurrentTime = useCallback(() => {
    const now = new Date()
    setDate(now)
    setInput(now.toISOString())
  }, [])

  const formats = useMemo((): TimeFormat[] => {
    if (!date) return []
    
    return [
      {
        label: 'ISO 8601',
        value: formatDateToISO8601(date),
        description: '国际标准日期时间格式',
      },
      {
        label: 'RFC 2822',
        value: formatDateToRFC2822(date),
        description: '电子邮件标准格式',
      },
      {
        label: 'HTTP Date',
        value: formatDateToHTTP(date),
        description: 'HTTP协议日期头格式',
      },
      {
        label: 'SQL DateTime',
        value: formatDateToSQL(date),
        description: 'SQL数据库日期时间格式',
      },
      {
        label: 'SQL Timestamp',
        value: formatDateToSQLTimestamp(date),
        description: 'SQL时间戳格式（含毫秒）',
      },
      {
        label: 'Unix Timestamp (秒)',
        value: formatDateToUnixTimestamp(date),
        description: 'Unix时间戳（秒级）',
      },
      {
        label: 'Unix Timestamp (毫秒)',
        value: formatDateToUnixMs(date),
        description: 'Unix时间戳（毫秒级）',
      },
      {
        label: 'Excel Serial',
        value: formatDateToExcel(date),
        description: 'Excel日期序列号',
      },
      {
        label: 'Julian Date',
        value: formatDateToJulian(date),
        description: '儒略日',
      },
      {
        label: '本地时间',
        value: formatDateToLocal(date),
        description: '浏览器本地时区',
      },
      {
        label: '自定义格式',
        value: formatDateToCustom(date, customFormat),
        description: '用户自定义格式',
      },
    ]
  }, [date, customFormat])

  const reset = () => {
    setInput('')
    setDate(new Date())
    setCustomFormat('YYYY-MM-DD HH:mm:ss')
  }

  return (
    <ToolLayout meta={meta} onReset={reset}>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={setCurrentTime} className="btn-primary">
          <RefreshCw className="w-4 h-4" />
          当前时间
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            输入时间
          </label>
          <input
            type="text"
            value={input}
            onChange={e => handleInput(e.target.value)}
            placeholder="输入时间戳、ISO日期或其他格式..."
            className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-base text-text-primary font-mono text-sm focus:outline-none focus:border-accent"
          />
          <p className="text-xs text-text-muted">
            支持格式：Unix时间戳(秒/毫秒)、ISO 8601、RFC 2822、HTTP Date等
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            自定义格式
          </label>
          <input
            type="text"
            value={customFormat}
            onChange={e => setCustomFormat(e.target.value)}
            placeholder="YYYY-MM-DD HH:mm:ss"
            className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-base text-text-primary font-mono text-sm focus:outline-none focus:border-accent"
          />
          <p className="text-xs text-text-muted">
            占位符: YYYY(年) MM(月) DD(日) HH(24时) hh(12时) mm(分) ss(秒) SSS(毫秒) A/a(AM/PM)
          </p>
        </div>
      </div>

      {date ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {formats.map(format => (
            <div
              key={format.label}
              className="p-3 rounded-xl bg-bg-surface border border-border-base"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-text-muted">{format.label}</span>
                <button
                  onClick={() => copy(format.value)}
                  className="p-1 rounded hover:bg-bg-raised"
                >
                  {copied ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3 text-text-muted" />}
                </button>
              </div>
              <code className="text-sm font-mono text-text-primary break-all">{format.value}</code>
              <p className="text-xs text-text-muted mt-1">{format.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-48 rounded-xl bg-bg-raised border border-border-base flex items-center justify-center">
          <p className="text-text-muted text-sm">输入有效的时间值以查看所有格式</p>
        </div>
      )}
    </ToolLayout>
  )
}
