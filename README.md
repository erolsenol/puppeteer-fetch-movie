# Puppeteer movie fetch experiment

An early Node.js experiment for fetching movie information and images with Puppeteer. The scraper targets third-party pages whose markup and availability can change; review the source before running it.

## Requirements

- Node.js 22 or newer
- A working Chromium environment supported by Puppeteer
- AWS credentials configured through the standard AWS credential chain only if you use S3 upload (for example, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in your local environment, or an AWS role)

Copy `.env.example` to `.env` and set the page URL you intend to use. Never commit credentials. The previously exposed AWS key was revoked; this repository no longer accepts the old custom `AWS_ACCESS_KEY` / `AWS_SECRET_KEY` variables, and AWS SDK v2 has been removed.

## Commands

```sh
npm ci
npm test
npm start
```

`npm start` runs the typed, bounded IMDb rating updater. It requires an explicit HTTPS `API_URL`, `SCRAPER_ALLOW_API_WRITES=true`, and `SCRAPER_ALLOWED_HOSTS=www.google.com,www.imdb.com`. Review and authorize the target API and source sites yourself before setting these values. `SCRAPER_MAX_PAGES` defaults to 1 and is capped at 100. Historical scraper modules remain for reference. S3 writes use the AWS SDK default credential provider chain and the `eu-central-1` region by default.

## Safety and licensing

Use the scraper only where permitted by the target site's terms and applicable law. No license is granted unless a `LICENSE` file is present.

The runner awaits each page, validates API records and rating values, and closes Chromium in `finally`. Browser requests are restricted to the configured host allowlist; API redirects are disabled. AWS is not initialized by the rating runner. Tests use local fixtures and do not scrape sites or write to an API. Use `npm run typecheck` and `npm test`.
