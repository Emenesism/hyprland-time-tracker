import clsx from 'clsx'

/**
 * Merge class names with clsx
 */
export function cn(...inputs) {
    return clsx(inputs)
}

/**
 * Format seconds into human-readable duration
 */
export function formatDuration(seconds) {
    if (!seconds) return '0s'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
}

/**
 * Format seconds into hours with configurable precision
 */
export function formatHours(seconds, precision = 1) {
    if (!seconds) return '0'
    const hours = seconds / 3600
    const digits = hours >= 10 ? precision : Math.max(precision, 2)
    return parseFloat(hours.toFixed(digits)).toString()
}

/**
 * Format ISO timestamp into time string
 */
export function formatTime(timestamp) {
    if (!timestamp) return 'N/A'
    try {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        })
    } catch {
        return timestamp
    }
}

/**
 * Get initials from a name
 */
export function getInitials(name) {
    if (!name) return '??'
    return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

/**
 * Chart colors for consistent visualization
 */
export const CHART_COLORS = [
    '#6366f1', // primary
    '#22d3ee', // accent
    '#34d399', // success
    '#fbbf24', // warning
    '#f87171', // danger
    '#a78bfa', // purple
    '#f472b6', // pink
    '#38bdf8', // sky
]
