import aws from "./src/aws/index.js";

import dotenv from "dotenv";
dotenv.config();

aws.initAws();

// import { StartFilmCehennemiLife } from "./src/fetch-services/hdfilmcehennemiLife.js";
// import { StartFilmCehennemi } from "./src/fetch-services/hdfilmcehennemi.js";
import {
  StartFilmIzlesene,
  UploadStartFilmIzlesene,
} from "./src/fetch-services/fullhdfilmizlesene.js";

// const basePageUrl = process.env.PAGE_URL_HDFILMCEHENNEMI;
// const basePageUrl = process.env.PAGE_URL_HDFILMCEHENNEMILIFE;
const fullHdFilmIzleseneUrl = process.env.PAGE_URL_FULLHDFILMIZLESENE;

// StartFilmCehennemiLife(basePageUrl);
// Start(basePageUrl);

// StartFilmIzlesene(fullHdFilmIzleseneUrl);
// UploadStartFilmIzlesene(basePageUrl);

import { StartImdbPoint } from "./src/fetch-services/imdbPoint.js";

StartImdbPoint();