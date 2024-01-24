const puppeteer = require("puppeteer");
const writeToJSON = require("../helpers/writeToJSON");
const writeToCsv = require("../helpers/writeToCsv");
const fs = require("fs");
const scrapeJobListing = require("./scrapeJobListing");

async function seekJobAdData({ jobDataConfig, exportType }) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // for (let i = 0; i < jobDataConfig.length; i++) {
  // const type = jobDataConfig.type;
  // const city = jobDataConfig.city;
  // const location = jobDataConfig.searchLocation;
  const date = new Date().toISOString().split("T")[0];

  //   if (
  //     fs.existsSync(`./data/${exportType}/${city}/${type}_${city}_${date}.json`)
  //   ) {
  //     console.log(`${type}_${city}_${date} - already scraped today`);
  //   } else {
  //     if (!fs.existsSync(`./data/${exportType}/${city}`)) {
  //       fs.mkdirSync(`./data/${exportType}/${city}`, {
  //         recursive: true,
  //       });
  //     }
  const jobsListingArr = await scrapeJobListing(page);

      // writeToJSON({
      //   jobsListingArr,
      //   type,
      //   city,
      //   date,
      // });
  writeToCsv({
    jobsListingArr,
    type,
    city,
    date,
  });

  

  await browser.close();
}

module.exports = seekJobAdData;
