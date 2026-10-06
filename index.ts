import 'dotenv/config';
import axios from 'axios';
import puppeteer, { type Page } from 'puppeteer';
import { actorsMatch, imdbUrl, parseMoviePage, readConfig, updateRatings, type Movie } from './src/runtime';

async function ratingFor(page: Page, movie: Movie): Promise<number | undefined> {
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(`imdb ${movie.title}`)}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const links = await page.$$eval('a[href]', (anchors) => anchors.map((anchor) => anchor.getAttribute('href') ?? ''));
  const urls = [...new Set(links.map(imdbUrl).filter((url): url is string => url !== undefined))];
  for (const url of urls) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const actors = await page.$$eval('[data-testid="title-cast-item__actor"]', (elements) => elements.map((element) => element.textContent ?? ''));
    if (!actorsMatch(movie.cast, actors)) continue;
    const rating = await page.$eval('[data-testid="hero-rating-bar__aggregate-rating__score"]', (element) => Number(element.firstElementChild?.textContent)).catch(() => undefined);
    if (rating !== undefined && Number.isFinite(rating) && rating > 0 && rating <= 10) return rating;
  }
  return undefined;
}

async function main(): Promise<void> {
  const config = readConfig(process.env);
  const api = axios.create({ baseURL: config.apiUrl, timeout: 10_000, maxRedirects: 0 });
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = new URL(request.url());
      const permitted = url.protocol === 'https:' && config.allowedHosts.has(url.hostname);
      void (permitted ? request.continue() : request.abort()).catch(() => {});
    });
    const updated = await updateRatings({
      list: async (number) => parseMoviePage((await api.get<unknown>('v1/movies', { params: { page: number, limit: 50 } })).data),
      update: async (id, rating) => { await api.patch(`v1/movies/${encodeURIComponent(id)}`, { imdb: { rating } }); },
    }, (movie) => ratingFor(page, movie), config.maxPages);
    console.log(`Updated ${updated} movie ratings.`);
  } finally { await browser.close(); }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Scraper failed.');
  process.exitCode = 1;
});
