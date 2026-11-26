import { parseLocalDate } from './dates';

describe('parseLocalDate', () => {
  it('keeps a date-only string on the day it names, in any timezone', () => {
    const d = parseLocalDate('2026-11-20');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(20);
  });

  it('leaves full timestamps to the normal parser', () => {
    const iso = '2026-11-20T15:30:00Z';
    expect(parseLocalDate(iso).getTime()).toBe(new Date(iso).getTime());
  });

  it('returns an invalid date for anything that is not a string or Date', () => {
    expect(isNaN(parseLocalDate(undefined).getTime())).toBe(true);
    expect(isNaN(parseLocalDate(null).getTime())).toBe(true);
  });
});
