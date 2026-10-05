import type { DeskReport } from '../types/tradingDesk';
import { isMarketOpen, lastClosedSession, nyParts, shiftSession } from '../../scripts/trading-desk/calendar.mjs';

const time = (value?: string) => value ? Date.parse(value) || 0 : 0;

export function isDeskReport(value: unknown): value is DeskReport {
  if (!value || typeof value !== 'object') return false;
  const r = value as DeskReport;
  return r.schemaVersion === 1 && /^\d{4}-\d{2}-\d{2}$/.test(r.session)
    && time(r.generatedAt) > 0 && Array.isArray(r.candidates) && Array.isArray(r.days)
    && Array.isArray(r.movements) && Array.isArray(r.alerts)
    && !!r.prices && !!r.coverage && !!r.market && !!r.email;
}

// A slow response or an older CDN replica must never roll the lists backwards.
export function newestDeskReport(a: DeskReport | null, b: DeskReport): DeskReport {
  if (!a) return b;
  if (a.session !== b.session) return b.session > a.session ? b : a;
  if (a.preview !== b.preview) return a.preview ? b : a;
  if (a.generatedAt !== b.generatedAt) return time(b.generatedAt) > time(a.generatedAt) ? b : a;
  return time(b.monitorStatus?.checkedAt) >= time(a.monitorStatus?.checkedAt) ? b : a;
}

export async function loadDeskReport(urls: string[], fetcher: typeof fetch = fetch) {
  const results = await Promise.allSettled(urls.map(async url => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetcher(url, {cache: 'no-store', signal: controller.signal});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const report: unknown = await response.json();
      if (!isDeskReport(report)) throw new Error('Publicación no válida');
      return report;
    } finally { clearTimeout(timeout); }
  }));
  const reports = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
  if (!reports.length) throw new Error('No se pudo cargar el seguimiento. Reintenta; las listas anteriores se conservan.');
  return {
    report: reports.reduce<DeskReport | null>(newestDeskReport, null)!,
    remoteAvailable: results[0].status === 'fulfilled',
  };
}

export function deskActivity(report: DeskReport, now = new Date()) {
  const armed = report.candidates.filter(row => row.plan?.armed).length;
  const changes = report.movements.filter(change => change.date === report.session).length;
  try {
    let expected = lastClosedSession(now);
    // The nightly job is scheduled at 22:37 UTC. Allow one hour for the runner.
    if (expected === nyParts(now).date && now.getUTCHours() * 60 + now.getUTCMinutes() < 23 * 60 + 37) {
      expected = shiftSession(expected, -1);
    }
    const marketOpen = isMarketOpen(now);
    const elapsed = now.getTime() - time(report.monitorStatus?.checkedAt);
    return {
      armed, changes, expected, outdated: report.session < expected, marketOpen,
      calendarKnown: true,
      monitorRecent: !!report.monitorStatus && elapsed >= -60000 && elapsed <= 45 * 60000,
    };
  } catch {
    return {armed, changes, expected: null, outdated: true, marketOpen: false, calendarKnown: false, monitorRecent: false};
  }
}

export function deskNavigationIndex(index: number, count: number, code: string, shift = false) {
  if (!count || !['Space', 'ArrowDown', 'ArrowUp'].includes(code)) return -1;
  const direction = code === 'ArrowUp' || (code === 'Space' && shift) ? -1 : 1;
  return Math.max(0, Math.min(count - 1, index + direction));
}
