import { describe, expect, it, vi } from 'vitest';
import { actorsMatch, imdbUrl, parseMoviePage, readConfig, updateRatings } from '../src/runtime';
const env = { API_URL: 'https://api.example.com/', SCRAPER_ALLOW_API_WRITES: 'true', SCRAPER_ALLOWED_HOSTS: 'www.google.com,www.imdb.com' };
describe('bounded scraper runtime', () => {
  it('requires explicit targets and write opt-in before doing I/O', () => {
    expect(() => readConfig({})).toThrow();
    expect(() => readConfig({ ...env, API_URL: 'https://user:password@api.example.com' })).toThrow();
    expect(() => readConfig({ ...env, SCRAPER_ALLOWED_HOSTS: '' })).toThrow();
    for (const value of ['0', '-1', '1.5', '101', 'bad']) expect(() => readConfig({ ...env, SCRAPER_MAX_PAGES: value })).toThrow();
    expect(readConfig(env).maxPages).toBe(1);
  });
  it('accepts only IMDb title links and normalizes Google redirects', () => {
    expect(imdbUrl('/url?q=https%3A%2F%2Fwww.imdb.com%2Ftitle%2Ftt123%2F')).toBe('https://www.imdb.com/title/tt123/');
    for (const value of ['https://www.imdb.com.evil.test/title/tt123/', 'https://user@www.imdb.com/title/tt123/', 'javascript:alert(1)', 'https://www.imdb.com/name/nm123']) expect(imdbUrl(value)).toBeUndefined();
  });
  it('requires distinct matching actors and never matches an empty cast', () => {
    expect(actorsMatch([], ['Actor'])).toBe(false);
    expect(actorsMatch([' A ', 'B', 'C'], ['a', 'A'])).toBe(false);
    expect(actorsMatch([' A ', 'B', 'C'], ['a', 'b'])).toBe(true);
  });
  it('rejects malformed API records', () => {
    expect(() => parseMoviePage({ results: [{}], totalPages: 1 })).toThrow();
    expect(() => parseMoviePage({ results: [], totalPages: -1 })).toThrow();
    expect(parseMoviePage({ results: [], totalPages: 0 })).toEqual({ movies: [], totalPages: 0 });
  });
  it('awaits every page and stops at the real last page', async () => {
    const list = vi.fn().mockResolvedValue({ movies: [{ id: 'a', title: 'Film', cast: [], rating: 6 }], totalPages: 2 });
    const update = vi.fn().mockResolvedValue(undefined);
    expect(await updateRatings({ list, update }, async () => 7, 5)).toBe(2);
    expect(list.mock.calls.map(([page]) => page)).toEqual([1, 2]);
    expect(update).toHaveBeenCalledTimes(2);
  });
  it('respects the page cap and ignores invalid or unchanged ratings', async () => {
    const list = vi.fn().mockResolvedValue({ movies: [{ id: 'a', title: 'Film', cast: [], rating: 7 }], totalPages: 100 });
    const update = vi.fn();
    for (const rating of [undefined, 7, 0, 11, Number.NaN]) expect(await updateRatings({ list, update }, async () => rating, 1)).toBe(0);
    expect(update).not.toHaveBeenCalled();
    expect(list).toHaveBeenCalledTimes(5);
  });
  it('propagates API failures instead of spawning recursive background work', async () => {
    const list = vi.fn().mockRejectedValue(new Error('API unavailable'));
    await expect(updateRatings({ list, update: vi.fn() }, async () => 7, 2)).rejects.toThrow('API unavailable');
    expect(list).toHaveBeenCalledOnce();
  });
});
