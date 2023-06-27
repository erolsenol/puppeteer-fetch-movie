import client from "../browser/puppeteer.js";
import axios from "axios";
import { timeout } from "../utils/helper.js";
import dotenv from "dotenv";
import qs from "qs";
import { JSDOM } from "jsdom";

dotenv.config();

const axiosConfig = {
  baseURL: process.env.API_URL,
  timeout: 10000,
};

const goToConfig = {
  waitUntil: "load",
  timeout: 0,
};

const apiInstance = axios.create(axiosConfig);

let page;

let startIndex = 0;

let pagination = {
  limit: 50,
  page: 1,
};

async function StartImdbPoint(nextPage = "") {
  const config = {
    params: {
      ...pagination,
    },
    paramsSerializer: (params) => qs.stringify(params, { encode: false }),
  };

  const res = await apiInstance.get("v1/movies", config);

  const movies = res.data.results;
  const totalPages = res.data.totalPages;
  // console.log(movies);
  if (startIndex < 1) {
    await client.initialize();
    page = await client.newPage("imdbPoint");
    // browser = await puppeteer.launch(config);
    // page = await browser.newPage();
  }

  console.log("123");
  for (let movie of movies) {
    if (movie.title) {
      const point = await fetchImdbPoint(movie);
      if (point) {
        if (movie.imdb.rating !== point) {
          const res = await apiInstance.patch("v1/movies/" + movie.id, {
            imdb: { rating: point },
          });
          if (res.status === 200) {
            console.log(`${movie.title} new point: ${point}`);
          }
        } else {
          console.log(`${movie.title} imdb points are the same`);
        }
      }
    }
  }

  // if (nextPage) {
  //   await page.goto(nextPage, goToConfig);
  //   await timeout(250);
  // }
  pagination.page++;
  startIndex++;
  console.log("123123");
  console.log("totalPages", totalPages);
  console.log("pagination.page", pagination.page);
  console.log("condition", totalPages <= pagination.page);
  if (totalPages <= pagination.page) {
    console.log("StartImdbPoint");
    StartImdbPoint();
  }
}

async function fetchImdbPoint({ title = "", cast }) {
  return new Promise(async (resolve, reject) => {
    if (!title) {
      console.log("title required");
      resolve(false);
    }

    await page.goto("https://www.google.com/", goToConfig);

    const textArea = await page.$("input[name='q']");
    if (textArea) {
      await textArea.evaluate((item, value) => {
        item.value = `imdb ${value}`;
        item.focus();
      }, title);

      await page.keyboard.press("Enter");
    }
    await page.waitForSelector('div[id="main"]');
    await timeout(300);

    const allA = await page.$$("a");

    const urls = [];
    for (let tagA of allA) {
      const href = await tagA.evaluate((item) => item.getAttribute("href"));
      if (href.includes("https://www.imdb.com/title/")) {
        urls.push(href);
      }
    }

    if (urls.length < 1) {
      console.log("urls not found");
      resolve(false);
    }

    for (let url of urls) {
      await page.goto("https://www.google.com/" + url);
      await timeout(250);

      const allActors = await page.$$(
        "a[data-testid='title-cast-item__actor']"
      );
      const actors = [];
      for (let actor of allActors) {
        const text = await actor.evaluate((item) => item.innerText);
        actors.push(text);
      }

      if (hasMatchActors(cast, actors)) {
        const pointArea = await page.$(
          "div[data-testid='hero-rating-bar__aggregate-rating__score']"
        );
        if (pointArea) {
          const point = await pointArea.evaluate(
            (item) => item.children[0].innerText
          );
          if (point) {
            resolve(Number(point));
            break;
          }
        }
      } else {
        console.log("actors did not match wrong page");
      }
    }

    resolve(false);
  });
}

function hasMatchActors(actors1 = [], actors2 = []) {
  const actors1Length = actors1.length,
    actors2Length = actors2.length;

  const threshold = Math.floor(actors1Length * 0.5);
  let matchingActors = 0;

  for (let actor1 of actors1) {
    for (let actor2 of actors2) {
      if (areStringsSimilar(actor1, actor2)) {
        matchingActors++;
      }
    }
  }

  return matchingActors >= threshold;
}

function areStringsSimilar(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  const minLength = Math.min(str1.length, str2.length);
  const threshold = maxLength * 0.8;

  let matchingChars = 0;
  for (let i = 0; i < minLength; i++) {
    if (str1[i] === str2[i]) {
      matchingChars++;
    }
  }

  return matchingChars >= threshold;
}

export { StartImdbPoint };
