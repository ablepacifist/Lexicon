// Dates without a time, read as the calendar day they name.
//
// `new Date('2026-11-20')` is UTC midnight by the spec, so anywhere west of Greenwich it
// renders as the 19th — the wishlist post went up "November 19" for every visitor in
// the Americas. A bare YYYY-MM-DD is a calendar day, not an instant, so it is built in
// local time; anything with a time component is left to the normal parser.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalDate(value) {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return new Date(NaN);
  const m = DATE_ONLY.exec(value.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

export default parseLocalDate;
