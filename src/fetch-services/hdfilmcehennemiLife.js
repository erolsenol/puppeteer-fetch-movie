import client from "../browser/puppeteer.js";
import axios from "axios";
import { timeout } from "../utils/helper.js";
import dotenv from "dotenv";
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

async function StartFilmCehennemiLife(nextPage) {
  if (startIndex < 1) {
    await client.initialize();
    page = await client.newPage("hdfilmcehennemi");
    // browser = await puppeteer.launch(config);
    // page = await browser.newPage();
  }

  await page.goto(nextPage, goToConfig);
  await timeout(250);

  const nextPageRes = await nextPageSet();
  const movieUrls = await pageMovieUrlsSet();
  console.log("movieUrls index:", startIndex, movieUrls);

  for (const el of movieUrls) {
    const movieObjectRes = await movieDetailFetch(el);
    // console.log("movieObjectRes", movieObjectRes);
    try {
      const createMovieRes = await apiInstance.post(
        "v1/movies",
        movieObjectRes
      );
      if (createMovieRes.status === 201) {
        console.log("Created:", movieObjectRes.title);
      } else if (createMovieRes.status === 500) {
        console.log("Not Created:", movieObjectRes.title);
      }
    } catch (error) {
      console.log(
        `status: ${error?.response?.status} - Text: ${error?.response?.statusText}`
      );
      if (error?.response?.status === 400) {
        console.log(error?.response);
      }
    }
  }

  startIndex += 1;

  if (nextPageRes) {
    await StartFilmCehennemi(nextPageRes);
  } else {
    console.log("completed");
  }
}

async function movieDetailFetch(pageUrl) {
  return new Promise(async (resolve, reject) => {
    const movieObject = {};

    page.goto(pageUrl, goToConfig);

    // await page.waitForSelector("div[class='filmalani']");

    await timeout(850);

    movieObject.fetchedSite = "hdfilmcehennemi.cx";
    movieObject.sourceUrl = pageUrl;

    const titleArea = await page.$("div[class='bolum-ismi']");
    const title0 = await titleArea.evaluate((item) => item.innerText.trim());
    movieObject.title0 = title0;
    const title = await (
      await page.$("#content > div.leftC > div:nth-child(1) > div.title > h1")
    ).evaluate((item) => item.innerText.trim());
    movieObject.title = title;

    const summaryArea = await page.$("div[id='film-aciklama']");
    const summary = await summaryArea.evaluate((item) => item.innerText.trim());
    movieObject.fullplot = summary;

    const movieInfoEls = await page.$("div[id='filmbilgileri']");
    const infoValues = await movieInfoEls.evaluate((infoEl) => {
      let movieObj = {
        cast: [],
        directors: [],
        year: 0,
        tags: [],
        genres: [],
      };
      let setObj = {
        0: "cast",
        1: "directors",
        2: "year",
        3: "tags",
      };
      let outerIndex = 0;

      for (let index = 2; index < infoEl.children.length; index++) {
        for (
          let innerIndex = 1;
          innerIndex < infoEl.children[index].children.length;
          innerIndex++
        ) {
          if (outerIndex == 2) {
            const yearNumber = Number(
              infoEl.children[index].children[innerIndex].innerText
            );
            if (yearNumber > 0) {
              movieObj[setObj[outerIndex]] = yearNumber;
            }
          } else if (infoEl.children[index].children[innerIndex].innerText) {
            movieObj[setObj[outerIndex]].push(
              infoEl.children[index].children[innerIndex].innerText
            );
          }
        }
        outerIndex += 1;
      }

      for (let index = 1; index < infoEl.children[0].children.length; index++) {
        if (infoEl.children[0].children[index].children[0].innerText) {
          movieObj.genres.push(
            infoEl.children[0].children[index].children[0].innerText
          );
        }
      }

      return movieObj;
    });
    Object.assign(movieObject, infoValues);

    const iframe = await page.$("div[class='video-container'] > iframe");
    if (iframe) {
      const url = await iframe.evaluate((item) =>
        item.getAttribute("data-src")
      );
      movieObject.url = url;
    }

    const movieOtherSource = await page.$("div[class='sources']");
    const sourceLength = await movieOtherSource.evaluate(
      (item) => item.children.length
    );
    if (sourceLength > 1) {
      movieObject.urls = [];

      async function urlObjCreate() {
        const inepisode = await page.$("div[class='inepisode']");
        const movieOtherArea = await page.$("div[class='sources']");
        const isSelectFirstTab = await movieOtherArea.evaluate(
          (item) => item.children[0].tagName == "SPAN"
        );

        if (isSelectFirstTab) {
          const url = await inepisode.evaluate(async (inepisode) => {
            const sources = inepisode.querySelector("div[class='sources']");
            const urlObj = {};
            urlObj.title = sources.children[0].innerText;
            const iframe = inepisode.querySelector("iframe");
            urlObj.url = iframe.getAttribute("data-src");
            return urlObj;
          });
          movieObject.urls.push(url);
          await inepisode.evaluate((item) =>
            item.querySelector("div[class='sources']").children[1].click()
          );

          await timeout(850);
        } else {
          const url = await inepisode.evaluate(async (inepisode) => {
            const sources = inepisode.querySelector("div[class='sources']");
            const urlObj = {};
            urlObj.title = sources.children[1].innerText;
            const iframe = inepisode.querySelector("iframe");
            urlObj.url = iframe.getAttribute("data-src");
            return urlObj;
          });
          movieObject.urls.push(url);
        }

        if (isSelectFirstTab) {
          await urlObjCreate();
        }
      }
      await urlObjCreate();
    }

    resolve(movieObject);
  });
}

async function pageMovieUrlsSet() {
  return new Promise(async (resolve, reject) => {
    const movieUrls = [];
    await page.waitForSelector("div[class='poster poster-pop']");
    const movieElements = await page.$$(
      "body > div.main-container.container.p-0.mt-0.mt-lg-5 > div > main > div > div.row > div.col > div.tab-content.p-3.p-sm-4.pb-0 > div > div"
    );
    if (!movieElements) {
      console.log("movieElements not found");
      reject(false);
    }
    for (let index = 0; index < movieElements.length; index++) {
      const movieUrl = await movieElements[index].evaluate((item) =>
        item.children[0].children[0].getAttribute("href")
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

    const nextBtn = await page.$("a[rel='next']");

    if (nextBtn) {
      const nextUrl = nextBtn.evaluate((item) => item.getAttribute("href"));
      if (nextUrl) {
        resolve(nextUrl);
      } else {
        resolve(false);
      }
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

export { StartFilmCehennemiLife };
