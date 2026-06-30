const COLOMBIA_TZ = "America/Bogota";

export function todayColombia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: COLOMBIA_TZ }).format(new Date());
}

export function toColombiaDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: COLOMBIA_TZ }).format(new Date(date));
}

export function nowColombia(): Date {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: COLOMBIA_TZ }).format(now);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COLOMBIA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = parts.find(p => p.type === "hour")?.value || "00";
  const m = parts.find(p => p.type === "minute")?.value || "00";
  const s = parts.find(p => p.type === "second")?.value || "00";
  return new Date(`${dateStr}T${h}:${m}:${s}-05:00`);
}

export function colombiaWeekRange(date?: Date): { startDate: Date; endDate: Date } {
  const base = date ? new Date(date) : new Date();
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: COLOMBIA_TZ }).format(base);
  const [y, m, d] = dateStr.split("-").map(Number);
  const colDayOfWeek = new Date(`${dateStr}T12:00:00-05:00`).getUTCDay();
  const monOffset = colDayOfWeek === 0 ? 6 : colDayOfWeek - 1;
  const startDate = new Date(Date.UTC(y, m - 1, d - monOffset, 5, 0, 0, 0));
  const endDate = new Date(Date.UTC(y, m - 1, d - monOffset + 6, 4, 59, 59, 999));
  return { startDate, endDate };
}

export function colombiaDayStart(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
}

export function colombiaDayEnd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 4, 59, 59, 999));
}

export function isSameColombianDay(d1: Date | string, d2: Date | string): boolean {
  return toColombiaDate(d1) === toColombiaDate(d2);
}

export function formatColombianTime(date: Date | string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: COLOMBIA_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatColombianDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: COLOMBIA_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatColombianDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: COLOMBIA_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

export function getWeekDays(weekStart: Date | string, weekEnd: Date | string): string[] {
  const days: string[] = [];
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Intl.DateTimeFormat("en-CA", { timeZone: COLOMBIA_TZ }).format(d));
  }
  return days;
}