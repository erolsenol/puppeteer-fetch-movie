import client from "../browser/puppeteer.js";
import axios from "axios";
import { timeout } from "../utils/helper.js";

const axiosConfig = {
  baseURL: process.env.API_URL,
  timeout: 10000,
};
const apiInstance = axios.create(axiosConfig);

let page;

let startIndex = 0;

async function StartFilmIzlesene(nextPage) {
  if (startIndex < 1) {
    await client.initialize();
    page = await client.newPage("fullhdfilmizlesene");
    // browser = await puppeteer.launch(config);
    // page = await browser.newPage();
  }
  await page.goto(nextPage);

  const nextPageRes = await nextPageSet();
  const movieUrls = await pageMovieUrlsSet();

  for (const el of movieUrls) {
    const movieObjectRes = await movieDetailFetch(el);
    // console.log("movieObjectRes", movieObjectRes);
    try {
      const createMovieRes = await apiInstance.post(
        "v1/movies",
        movieObjectRes
      );
      if (createMovieRes.status === 201) {
        console.log("Created:", movieObjectRes);
      } else if (createMovieRes.status === 500) {
        console.log("Not Created:", movieObjectRes.title);
      }
    } catch (error) {
      console.log(
        `status: ${error?.response?.status} - Text: ${error?.response?.statusText}`
      );
    }
  }

  startIndex += 1;

  if (nextPageRes) {
    await StartFilmIzlesene(nextPageRes);
  } else {
    console.log("completed");
  }
}

async function movieDetailFetch(pageUrl) {
  return new Promise(async (resolve, reject) => {
    const movieObject = {};
    await page.goto(pageUrl);
    await page.waitForSelector("div[id='plx']");
    await timeout(250);

    movieObject.fetchedSite = "fullhdfilmizlesene.pw";
    movieObject.sourceUrl = pageUrl;

    const titleArea = await page.$("div[class='izle-titles']");

    const titles = await titleArea.evaluate((item) => {
      const innerTitles = [];
      for (const el of item.children) {
        innerTitles.push(el.innerText);
      }
      return innerTitles;
    });
    for (let index = 0; index < titles.length; index++) {
      if (index == 0) {
        movieObject.title = titles[index];
      } else {
        movieObject[`title${index - 1}`] = titles[index];
      }
    }

    const imdbArea = await page.$("div[class='imdb-ic']");
    const imdbPoint = await imdbArea.evaluate(
      (item) => item.children[0].innerText
    );
    movieObject.imdb = { rating: Number(imdbPoint) };

    const summaryArea = await page.$("div[class='ozet-ic'] > p");
    const summary = await summaryArea.evaluate((item) => item.innerText);
    movieObject.fullplot = summary;

    const movieInfoLu = await page.$("div[class='film-info'] > ul");
    const infoValues = await movieInfoLu.evaluate((item) => {
      let movieObj = {
        directors: [],
        cast: [],
        year: 0,
        genres: [],
        category: [],
        languages: [],
        tags: [],
      };
      let setObj = {
        0: "directors",
        1: "cast",
        2: "year",
        3: "genres",
        4: "category",
        5: "languages",
        6: "tags",
      };
      let index = 0;
      for (const elLi of item.children) {
        let innerIndex = 0;
        for (const liValue of elLi.children[1].children) {
          if (index == 2) {
            if (innerIndex == 0) {
              movieObj[setObj[index]] = Number(
                liValue.innerText.substring(0, 4)
              );
            }
          } else {
            movieObj[setObj[index]].push(liValue.innerText);
          }
          innerIndex += 1;
        }
        index += 1;
      }
      if (!movieObj.year) {
        movieObj.year = 0;
      }
      return movieObj;
    });

    Object.assign(movieObject, infoValues);

    const iframe = await page.$("#plx > iframe");
    const url = await iframe.evaluate((item) => item.getAttribute("src"));
    movieObject.url = url;

    const movieOtherSource = await page.$$("div[class='part-sources'] > a");

    const urls = [];
    for (const linEl of movieOtherSource) {
      await linEl.evaluate((item) => item.click());
      await timeout(350);
      const iframeEl = await page.$("#plx > iframe");
      const iframeSrc = await iframeEl.evaluate((item) =>
        item.getAttribute("src")
      );
      const sourceTitle = await linEl.evaluate((item) => item.innerText);

      urls.push({ title: sourceTitle, url: iframeSrc });
    }
    movieObject.urls = urls;

    const timeEl = await page.$(
      "section[class='detay-sol'] > span[class='sure']"
    );
    if (timeEl) {
      const timeText = await timeEl.evaluate((item) =>
        item.innerText.replace(" dk", "")
      );
      const time = Number(timeText);
      if (time > 0) {
        movieObject.minutes = Number(time);
      }
    }

    const uhd = await page.$("section[class='detay-sol'] > span[class='uhd']");
    if (uhd) {
      movieObject.uhd = true;
    }

    const hdOne = await page.$("section[class='detay-sol'] > span[class='hd']");
    const hdTwo = await page.$(
      "section[class='detay-sol'] > span[class='hd hd-2']"
    );
    if (hdOne || hdTwo) {
      movieObject.hd = true;
    }

    resolve(movieObject);
  });
}

async function pageMovieUrlsSet() {
  return new Promise(async (resolve, reject) => {
    const movieUrls = [];
    await page.waitForSelector("ul[class='list']");
    const movieElements = await page.$$("ul[class='list'] > li");
    if (!movieElements) {
      console.log("movieElements not found");
      reject(false);
    }
    for (let index = 0; index < movieElements.length; index++) {
      const movieUrl = await movieElements[index].evaluate((item) =>
        item.children[0].getAttribute("href")
      );
      movieUrls.push(movieUrl);
    }

    resolve(movieUrls);
  });
}

async function nextPageSet() {
  return new Promise(async (resolve, reject) => {
    // const waitNextEl = await page.waitForSelector("a[class='ileri']");
    // console.log("waitNextEl", waitNextEl);
    await timeout(250);

    const nextBtn = await page.$("a[class='ileri']");

    if (nextBtn) {
      const nextPageUrl = await nextBtn.evaluate((btn) =>
        btn.getAttribute("href")
      );
      resolve(nextPageUrl);
    } else {
      console.log("next button not found");
      resolve(false);
    }
  });
}

// (async () => {
//   browser = await puppeteer.launch(config);
//   page = await browser.newPage();
//   const movieObjectRes = await movieDetailFetch(
//     "https://www.fullhdfilmizlesene.pw/film/galaksinin-koruyuculari-2-izle-3/"
//   );
//   console.log("movieObjectRes", movieObjectRes);
// })();

export { StartFilmIzlesene };
