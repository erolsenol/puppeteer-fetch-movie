export interface ScraperConfig {
  readonly apiUrl: string;
  readonly allowedHosts: ReadonlySet<string>;
  readonly maxPages: number;
}

export function readConfig(env: Readonly<Record<string, string | undefined>>): ScraperConfig {
  if (env.SCRAPER_ALLOW_API_WRITES !== 'true') throw new Error('Set SCRAPER_ALLOW_API_WRITES=true only for an API you intend to update.');
  const apiUrl = new URL(env.API_URL ?? '');
  if (apiUrl.protocol !== 'https:' || apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) throw new Error('API_URL must be an explicit HTTPS base URL without credentials, query or fragment.');
  const allowedHosts = new Set((env.SCRAPER_ALLOWED_HOSTS ?? '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean));
  for (const host of ['www.google.com', 'www.imdb.com']) {
    if (!allowedHosts.has(host)) throw new Error(`SCRAPER_ALLOWED_HOSTS must explicitly include ${host}.`);
  }
  const maxPages = Number(env.SCRAPER_MAX_PAGES ?? '1');
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 100) throw new Error('SCRAPER_MAX_PAGES must be an integer from 1 to 100.');
  return { apiUrl: apiUrl.href.endsWith('/') ? apiUrl.href : `${apiUrl.href}/`, allowedHosts, maxPages };
}

export function imdbUrl(value: string): string | undefined {
  try {
    let url = new URL(value, 'https://www.google.com');
    if (url.hostname === 'www.google.com' && url.pathname === '/url') url = new URL(url.searchParams.get('q') ?? url.searchParams.get('url') ?? '');
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        !['www.imdb.com', 'imdb.com'].includes(url.hostname) || !/^\/title\/tt\d+\/?$/.test(url.pathname)) return undefined;
    return `https://www.imdb.com${url.pathname}`;
  } catch { return undefined; }
}

export function actorsMatch(expected: readonly string[], observed: readonly string[]): boolean {
  const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');
  const names = [...new Set(expected.map(normalize).filter(Boolean))];
  const actual = new Set(observed.map(normalize));
  return names.length > 0 && names.filter((name) => actual.has(name)).length >= Math.ceil(names.length / 2);
}

export interface Movie {
  readonly id: string;
  readonly title: string;
  readonly cast: readonly string[];
  readonly rating?: number;
}
export interface MoviePage { readonly movies: readonly Movie[]; readonly totalPages: number; }
export interface MovieApi {
  readonly list: (page: number) => Promise<MoviePage>;
  readonly update: (id: string, rating: number) => Promise<void>;
}

export function parseMoviePage(value: unknown): MoviePage {
  if (typeof value !== 'object' || value === null || !('results' in value) || !Array.isArray(value.results) ||
      !('totalPages' in value) || typeof value.totalPages !== 'number' || !Number.isSafeInteger(value.totalPages) || value.totalPages < 0) throw new Error('Invalid movie API page.');
  const movies = value.results.map((item: unknown): Movie => {
    if (typeof item !== 'object' || item === null || !('id' in item) || typeof item.id !== 'string' || !item.id ||
        !('title' in item) || typeof item.title !== 'string' || !('cast' in item) || !Array.isArray(item.cast) ||
        !item.cast.every((name: unknown) => typeof name === 'string')) throw new Error('Invalid movie API record.');
    const imdb = 'imdb' in item ? item.imdb : undefined;
    const rating = typeof imdb === 'object' && imdb !== null && 'rating' in imdb && typeof imdb.rating === 'number' ? imdb.rating : undefined;
    return { id: item.id, title: item.title, cast: item.cast, rating };
  });
  return { movies, totalPages: value.totalPages };
}

export async function updateRatings(api: MovieApi, lookup: (movie: Movie) => Promise<number | undefined>, maxPages: number): Promise<number> {
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 100) throw new Error('Invalid page limit.');
  let updated = 0;
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await api.list(page);
    for (const movie of result.movies) {
      if (!movie.title.trim()) continue;
      const rating = await lookup(movie);
      if (rating !== undefined && Number.isFinite(rating) && rating > 0 && rating <= 10 && rating !== movie.rating) {
        await api.update(movie.id, rating);
        updated += 1;
      }
    }
    if (page >= result.totalPages) break;
  }
  return updated;
}
