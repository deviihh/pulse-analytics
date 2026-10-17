// The dashboard offers 7, 30 or 90 days. Anything else falls back to 30.
export function parseDays(value: string | undefined) {
  const n = Number(value);
  return [7, 30, 90].includes(n) ? n : 30;
}
