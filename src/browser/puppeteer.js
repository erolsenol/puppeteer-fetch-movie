import puppeteer from "puppeteer";

const browserConfig = {
  headless: false,
  defaultViewport: null,
  waitUntil: "networkidle2",
};

const goToConfig = {
  waitUntil: "load",
  timeout: 0,
};

const client = {
  browser: null,
  pages: {},
  get getBrowser() {
    return this.browser;
  },
  async initialize() {
    const browser = await puppeteer.launch(browserConfig);
    this.browser = browser;
  },
  async newPage(pageName) {
    if (!this.pages.hasOwnProperty(pageName)) {
      const page = await this.browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36"
      );
      this.pages[pageName] = page;
      return page;
    } else {
      console.log("Page already exists");
      return false;
    }
  },
  getPage(pageName) {
    if (this.pages.hasOwnProperty(pageName)) {
      return this.pages[pageName];
    } else {
      console.log("page not found");
      return false;
    }
  },
};

export default client;
