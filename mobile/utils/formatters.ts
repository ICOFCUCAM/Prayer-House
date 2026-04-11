/**
 * Format a number to compact notation: 1200 → "1.2K", 1500000 → "1.5M"
 */
export function formatCount(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return String(n);
}

/**
 * Format duration in seconds to mm:ss
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a number as USD currency: 12.5 → "$12.50"
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format an ISO date string to "Mar 12, 2026"
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get hex colour for a creator level
 */
export function getLevelColour(level: string): string {
  const normalized = level.toLowerCase().replace(/\s+/g, '');
  const map: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFB800',
    platinum: '#E5E4E2',
    diamond: '#00D9FF',
    globalambassador: '#9D4EDD',
  };
  return map[normalized] ?? '#FFFFFF';
}
