const COLOMBIA_TZ = "America/Bogota";

export function todayColombia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: COLOMBIA_TZ }).format(new Date());
}

export function toColombiaDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: COLOMBIA_TZ }).format(new Date(date));
}

export function colombiaMidnight(dateStr?: string): Date {
  if (dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
  }
  return colombiaMidnight(todayColombia());
}

export function colombiaDateRange(daysBack: number, daysForward: number): { start: Date; end: Date } {
  const [y, m, d] = todayColombia().split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, d + daysBack, 5, 0, 0, 0)),
    end: new Date(Date.UTC(y, m - 1, d + daysForward + 1, 4, 59, 59, 999)),
  };
}
