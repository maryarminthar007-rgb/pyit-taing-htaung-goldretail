const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const UK_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function isValidParts(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function formatDate(value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;
  const match = value.slice(0, 10).match(ISO_DATE);
  if (!match) return fallback;
  const [, year, month, day] = match;
  if (!isValidParts(Number(year), Number(month), Number(day))) return fallback;
  return `${day}/${month}/${year}`;
}

export function parseDateInput(value: string) {
  const match = value.trim().match(UK_DATE);
  if (!match) return null;
  const [, day, month, year] = match;
  if (!isValidParts(Number(year), Number(month), Number(day))) return null;
  return `${year}-${month}-${day}`;
}

export function dateFromIso(value: string | null | undefined) {
  if (!value) return undefined;
  const match = value.slice(0, 10).match(ISO_DATE);
  if (!match) return undefined;
  const [, year, month, day] = match;
  if (!isValidParts(Number(year), Number(month), Number(day))) return undefined;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function isoFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIso() {
  return isoFromDate(new Date());
}