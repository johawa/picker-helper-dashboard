import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Router, RouterLink } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { berryLabel, helsinki, kgLabel, SessionSummary } from '../../models';
import { SessionsApi } from '../../services/sessions-api';

@Component({
  selector: 'app-session-list',
  imports: [
    RouterLink,
    FormsModule,
    MatProgressBar,
    MatSortModule,
    MatTableModule,
    MatFormFieldModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './session-list.html',
  styleUrl: './session-list.css',
})
export class SessionListPage {
  private readonly api = inject(SessionsApi);
  private readonly router = inject(Router);
  readonly columns = ['name', 'berry', 'supervisor', 'preset', 'boxes', 'kilograms', 'sent'];
  readonly loading = signal(true);
  readonly error = signal('');
  readonly sessions = signal<SessionSummary[]>([]);
  readonly query = signal('');
  readonly rangeStart = signal<Date | null>(null);
  readonly rangeEnd = signal<Date | null>(null);
  readonly hideEmpty = signal(true);
  readonly sort = signal<Sort>({ active: '', direction: '' });
  readonly berryLabel = berryLabel;
  readonly helsinki = helsinki;
  readonly kgLabel = kgLabel;
  readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    const start = this.rangeStart();
    const end = this.rangeEnd();
    const hideEmpty = this.hideEmpty();
    return this.sessions().filter((row) => {
      if (hideEmpty && row.boxCount === 0) return false;
      if (query && !matches(row, query)) return false;
      return inDateRange(row, start, end);
    });
  });
  readonly groups = computed(() => groupByDay(this.filtered(), this.sort()));
  readonly tableRows = computed(() => flattenGroups(this.groups()));
  readonly narrowed = computed(
    () => Boolean(this.query().trim() || this.rangeStart() || this.rangeEnd() || this.hideEmpty()),
  );
  readonly isDay = (_index: number, row: ListItem) => row.type === 'day';
  readonly isSession = (_index: number, row: ListItem) => row.type === 'session';

  constructor() {
    this.api.list().subscribe({
      next: (result) => {
        this.sessions.set(result.sessions);
        this.loading.set(false);
      },
      error: (problem: Error) => {
        this.error.set(problem.message);
        this.loading.set(false);
      },
    });
  }

  onQuery(value: string): void {
    this.query.set(value);
  }

  onSort(sort: Sort): void {
    this.sort.set(sort);
  }

  onStart(value: Date | null): void {
    this.rangeStart.set(value);
  }

  onEnd(value: Date | null): void {
    this.rangeEnd.set(value);
  }

  clearRange(): void {
    this.rangeStart.set(null);
    this.rangeEnd.set(null);
  }

  onHideEmpty(checked: boolean): void {
    this.hideEmpty.set(checked);
  }

  open(row: SessionSummary): void {
    void this.router.navigate(['/sessions/detail'], { queryParams: { id: row.id } });
  }
}

type ListItem =
  | { type: 'day'; day: string; label: string; count: number; kilograms: number }
  | { type: 'session'; session: SessionSummary };

interface DayGroup {
  day: string;
  label: string;
  rows: SessionSummary[];
  kilograms: number;
}

function groupByDay(rows: SessionSummary[], sort: Sort): DayGroup[] {
  const buckets = new Map<string, SessionSummary[]>();
  for (const row of rows) {
    const day = sessionDay(row) ?? 'unknown';
    const list = buckets.get(day) ?? [];
    list.push(row);
    buckets.set(day, list);
  }
  return [...buckets.keys()]
    .sort((a, b) => {
      if (a === 'unknown') return 1;
      if (b === 'unknown') return -1;
      return b.localeCompare(a);
    })
    .map((day) => {
      const grouped = sortRows(buckets.get(day) ?? [], sort);
      return {
        day,
        label: day === 'unknown' ? 'No date' : dayLabel(day),
        rows: grouped,
        kilograms: roundKg(grouped.reduce((sum, row) => sum + row.totalKg, 0)),
      };
    });
}

function flattenGroups(groups: DayGroup[]): ListItem[] {
  const items: ListItem[] = [];
  for (const group of groups) {
    items.push({
      type: 'day',
      day: group.day,
      label: group.label,
      count: group.rows.length,
      kilograms: group.kilograms,
    });
    for (const session of group.rows) items.push({ type: 'session', session });
  }
  return items;
}

function dayLabel(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, date)));
}

function roundKg(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function inDateRange(row: SessionSummary, start: Date | null, end: Date | null): boolean {
  if (!start && !end) return true;
  const day = sessionDay(row);
  if (!day) return false;
  if (start && day < calendarDay(start)) return false;
  if (end && day > calendarDay(end)) return false;
  return true;
}

function sessionDay(row: SessionSummary): string | null {
  if (row.latestAt) {
    const fromBox = helsinkiDay(row.latestAt);
    if (fromBox) return fromBox;
  }
  const match = row.name.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function helsinkiDay(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function calendarDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function matches(row: SessionSummary, query: string): boolean {
  const haystack = [row.name, row.berry, row.supervisor, String(row.boxCount), String(row.totalKg)]
    .filter((part) => part != null && part !== '')
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function sortRows(rows: SessionSummary[], sort: Sort): SessionSummary[] {
  if (!sort.active || !sort.direction) return rows;
  const direction = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => compare(a, b, sort.active, direction));
}

function compare(a: SessionSummary, b: SessionSummary, column: string, direction: number): number {
  const left = sortValue(a, column);
  const right = sortValue(b, column);
  const leftMissing = left == null || left === '';
  const rightMissing = right == null || right === '';
  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) return 0;
    return leftMissing ? 1 : -1;
  }
  const order =
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
  return order * direction;
}

function sortValue(row: SessionSummary, column: string): string | number | null {
  switch (column) {
    case 'name':
      return row.name;
    case 'berry':
      return row.berry;
    case 'supervisor':
      return row.supervisor;
    case 'preset':
      return row.defaultWeight;
    case 'boxes':
      return row.boxCount;
    case 'kilograms':
      return row.totalKg;
    case 'sent':
      return row.syncedAt ? Date.parse(row.syncedAt) : null;
    default:
      return null;
  }
}
