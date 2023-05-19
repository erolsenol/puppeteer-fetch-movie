import dotenv from "dotenv";
dotenv.config();

import { StartFilmCehennemiLife } from "./src/fetch-services/hdfilmcehennemiLife.js";
// import { StartFilmCehennemi } from "./src/fetch-services/hdfilmcehennemi.js";
// import { StartFilmIzlesene } from "./src/fetch-services/fullhdfilmizlesene.js";

// const basePageUrl = process.env.PAGE_URL_FULLHDFILMIZLESENE;
// const basePageUrl = process.env.PAGE_URL_HDFILMCEHENNEMI;
const basePageUrl = process.env.PAGE_URL_HDFILMCEHENNEMILIFE;

StartFilmCehennemiLife(basePageUrl);
// Start(basePageUrl);
