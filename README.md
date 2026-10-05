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

`npm start` launches the historical scraper. It may need source changes to work with current target sites. S3 writes use the AWS SDK default credential provider chain and the `eu-central-1` region by default.

## Safety and licensing

Use the scraper only where permitted by the target site's terms and applicable law. No license is granted unless a `LICENSE` file is present.
