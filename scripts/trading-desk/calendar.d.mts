export function nyParts(now?: Date): {date: string; minutes: number};
export function isSession(date: string): boolean;
export function closeMinutes(date: string): number;
export function shiftSession(date: string, direction?: number): string;
export function lastClosedSession(now?: Date): string;
export function isMarketOpen(now?: Date): boolean;
