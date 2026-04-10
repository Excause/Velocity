import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

export function formatPrice(value, decimals = 2) {
  if (value == null) return '—'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPriceCompact(value) {
  if (value == null) return '—'
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export function formatChange(value, showSign = true) {
  if (value == null) return '—'
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}

export function formatChangePct(value, showSign = true) {
  if (value == null) return '—'
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatMarketCap(value) {
  if (!value) return '—'
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} Bio. €`
  if (value >= 1e9)  return `${(value / 1e9).toFixed(1)} Mrd. €`
  if (value >= 1e6)  return `${(value / 1e6).toFixed(0)} Mio. €`
  return `${value.toLocaleString('de-DE')} €`
}

export function formatVolume(value) {
  if (!value) return '—'
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  return value.toString()
}

export function formatDate(dateStr) {
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(date, 'dd.MM.yyyy')
  } catch {
    return dateStr
  }
}

export function formatTime(dateStr) {
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(date, 'HH:mm')
  } catch {
    return ''
  }
}

export function formatRelativeTime(dateStr) {
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return formatDistanceToNow(date, { addSuffix: true, locale: de })
  } catch {
    return dateStr
  }
}

export function formatNumber(value, decimals = 0) {
  if (value == null) return '—'
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function colorForChange(value) {
  if (value > 0) return 'text-bull'
  if (value < 0) return 'text-bear'
  return 'text-gray-400'
}

export function bgColorForChange(value) {
  if (value > 0) return 'bg-bull'
  if (value < 0) return 'bg-bear'
  return 'bg-gray-600'
}

export function sentimentColor(sentiment) {
  if (sentiment === 'positive') return 'badge-bull'
  if (sentiment === 'negative') return 'badge-bear'
  return 'badge-watch'
}

export function actionColor(action) {
  if (action === 'buy') return 'badge-bull'
  if (action === 'sell') return 'badge-bear'
  return 'badge-watch'
}

export function actionLabel(action) {
  if (action === 'buy') return 'KAUFEN'
  if (action === 'sell') return 'VERKAUFEN'
  return 'BEOBACHTEN'
}

export function riskLabel(risk) {
  if (risk === 'low') return 'Niedrig'
  if (risk === 'high') return 'Hoch'
  return 'Mittel'
}

export function confidenceColor(confidence) {
  if (confidence >= 80) return 'text-bull'
  if (confidence >= 60) return 'text-watch'
  return 'text-bear'
}
