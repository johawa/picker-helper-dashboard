export interface SessionSummary {
  id: string;
  name: string;
  berry: string | null;
  supervisor: string | null;
  defaultWeight: number | null;
  syncedAt: string | null;
  boxCount: number;
  totalKg: number;
  latestAt: string | null;
  orphan: boolean;
}

export interface BoxRow {
  id: string;
  pickerId: number;
  amount: number;
  timestamp: string;
  date: string;
}

export interface SessionDetail extends SessionSummary {
  boxes: BoxRow[];
}

export function helsinki(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Helsinki',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function kgLabel(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const text = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 }).format(value);
  return `${text} kg`;
}

export function berryLabel(value: string | null): string {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
