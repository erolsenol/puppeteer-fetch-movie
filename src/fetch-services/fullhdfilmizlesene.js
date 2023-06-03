import client from "../browser/puppeteer.js";
import axios from "axios";
import { timeout } from "../utils/helper.js";
import aws from "../aws/index.js";
import dotenv from "dotenv";
dotenv.config();

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

    try {
      if (movieObjectRes) {
        const createMovieRes = await apiInstance.post(
          "v1/movies",
          movieObjectRes
        );
        if (createMovieRes.status === 201) {
          console.log("Created:", movieObjectRes?.title);
        } else if (createMovieRes.status === 500) {
          console.log("Not Created:", movieObjectRes?.title);
        }
      }
    } catch (error) {
      console.log(
        `status: ${error?.response?.status} - Text: ${error?.response?.statusText}`
      );
    }
  }

  startIndex += 1;

  if (nextPageRes) {
    console.log("Next Page:", nextPageRes);
    await StartFilmIzlesene(nextPageRes);
  } else {
    console.log("completed");
  }
}

let uploadIndex = 0;

async function UploadStartFilmIzlesene(nextPage) {
  if (uploadIndex < 1) {
    await client.initialize();
    page = await client.newPage("fullhdfilmizlesene");
    // browser = await puppeteer.launch(config);
    // page = await browser.newPage();
  }

  await page.goto(nextPage);

  const nextPageRes = await nextPageSet();
  const movieUrls = await pageMovieUrlsSet();

  for (const el of movieUrls) {
    try {
      const movieObjectRes = await movieImageUpload(el);

      if (movieObjectRes.status === 200) {
        console.log("Image Upload Completed:", movieObjectRes.data.title);
      } else if (movieObjectRes.status === 500) {
        console.log("Image Upload Not Completed:", movieObjectRes.data.title);
      }
    } catch (error) {
      // console.log(
      //   `status: ${error?.response?.status} - Text: ${error?.response?.statusText}`
      // );
    }
  }

  uploadIndex += 1;

  if (nextPageRes) {
    console.log("next page:", nextPageRes);
    await UploadStartFilmIzlesene(nextPageRes);
  } else {
    console.log("completed");
  }
}

async function movieImageUpload(pageUrl) {
  return new Promise(async (resolve, reject) => {
    await page.goto(pageUrl);
    await page.waitForSelector("div[id='plx']");
    await timeout(250);

    const titleArea = await page.$("div[class='izle-titles']");

    const movieTitle = await titleArea.evaluate(
      (item) => item.children[0].innerText
    );

    const movieRes = await apiInstance.post("v1/movies/get-title-by-one", {
      title: movieTitle.trim(),
    });

    if (movieRes.status === 200 && movieRes.data?.length > 0) {
      const movieId = movieRes.data[0].id;

      // if (!movieRes.data[0].img) {
      //   console.log("img property not found");
      //   resolve(false);
      //   return;
      // }

      const newMovieItem = movieRes.data[0];
      delete newMovieItem.img;
      delete newMovieItem.id;

      const imgObj = await page.$(
        "body > div.orta.izle > div.alan.main > article > div.izle-content > section.detay-sol > picture > img"
      );
      const imgSrc = await imgObj.evaluate((item) => item.getAttribute("src"));

      const imageRes = await axios.get(imgSrc, {
        responseType: "arraybuffer",
      });

      // const bin = imageRes.data.toString("binary");

      // const imgBase64 = base64ArrayBuffer(imageRes.data);
      // console.log("imgBase64", imgBase64);

      if (imageRes.status === 200) {
        const uploadRes = await aws.auploadToS3(
          imageRes.data,
          "movie-project-images",
          `image/${movieTitle.replace(/ /g, "-")}`
        );

        if (uploadRes.$metadata.httpStatusCode === 200) {
        }
        // try {
        //   const imgSendRes = await apiInstance.patch(
        //     `v1/movies/${movieId}`,
        //     newMovieItem
        //     // {
        //     //   img: bin,
        //     // }
        //   );
        //   if (imgSendRes.status === 200) {
        //     resolve(imgSendRes);
        //   }
        // } catch (error) {
        //   console.log("error:", error?.response?.status);
        //   resolve(false);
        // }
      } else {
        resolve(false);
      }
    } else {
      resolve(false);
    }
  });
}

function base64ArrayBuffer(arrayBuffer) {
  var base64 = "";
  var encodings =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  var bytes = new Uint8Array(arrayBuffer);
  var byteLength = bytes.byteLength;
  var byteRemainder = byteLength % 3;
  var mainLength = byteLength - byteRemainder;

  var a, b, c, d;
  var chunk;

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
    d = chunk & 63; // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength];

    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4; // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + "==";
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2; // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + "=";
  }

  return base64;
}

async function movieDetailFetch(pageUrl) {
  return new Promise(async (resolve, reject) => {
    const movieObject = {};
    movieObject.sourceUrl = pageUrl;

    await page.goto(pageUrl);
    await page.waitForSelector("div[id='plx']");

    // await timeout(250);

    try {
      const getMovieSourceUrlRes = await apiInstance.post(
        "v1/movies/get-movie-by-source-url",
        { sourceUrl: movieObject.sourceUrl }
      );
      if (
        getMovieSourceUrlRes?.status === 200 &&
        getMovieSourceUrlRes?.data?.length > 0
      ) {
        resolve(false);
        return;
      }
    } catch (error) {
      console.log("get-movie-by-source-url error:");
    }

    movieObject.fetchedSite = "fullhdfilmizlesene.pw";

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

    try {
      const getMovieByTitleRes = await apiInstance.post(
        "v1/movies/get-title-by-one",
        { title: movieObject.title }
      );
      if (
        getMovieByTitleRes?.status === 200 &&
        getMovieByTitleRes?.data?.length > 0
      ) {
        movieObject.title = `${movieObject.title}-${getMovieByTitleRes.data.length}`;
      }
    } catch (error) {
      console.log("get-movie-by-source-url error:");
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

    const imgObj = await page.$(
      "body > div.orta.izle > div.alan.main > article > div.izle-content > section.detay-sol > picture > img"
    );
    const imgSrc = await imgObj.evaluate((item) => item.getAttribute("src"));

    try {
      console.log("imgSrc:", imgSrc);
      const imageRes = await axios.get(imgSrc, {
        responseType: "arraybuffer",
      });

      if (imageRes.status === 200) {
        const imageName = movieObject.title.replace(/ /g, "-");
        const uploadRes = await aws.auploadToS3(
          imageRes.data,
          "movie-project-images",
          `image/${imageName}`
        );

        if (uploadRes.$metadata.httpStatusCode === 200) {
          movieObject.img = imageName;
          resolve(movieObject);
        } else {
          resolve(false);
        }
      } else {
        resolve(false);
      }
    } catch (error) {
      console.log("image fetch error:", imgSrc);
      resolve(false);
    }
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

export { StartFilmIzlesene, UploadStartFilmIzlesene };
