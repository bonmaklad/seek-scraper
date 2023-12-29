const jobInfoPerPageQuery = require("./queries/jobInfoPerPageQuery");
const pageCountQuery = require("./queries/pageCountQuery");

async function getPageCount(page, url) {
  let pages;

  try {
    await page.goto(url, {
      waitUntil: "networkidle2",
    });
    pages = await page.evaluate(pageCountQuery);
  } catch (e) {
    console.error(
      new Error("ERROR: await page.evaluate(pageCountQuery)", { page, url })
    );
    throw e;
  }

  return pages;
}

async function scrapeJobAds(page, url) {
  await page.goto(url, {
    waitUntil: "networkidle2",
  });
  let data = await page.evaluate(jobInfoPerPageQuery);

  return data;
}
// old       `https://www.seek.co.nz/${type}-jobs/in-${location}?salaryrange=120000-999999&salarytype=annual`

async function scrapeJobListing(page, { type, location }) {
  const allJobsArr = [];
  let pageCount;
  try {
    pageCount = await getPageCount(
      page,
      `https://www.seek.co.nz/jobs/in-${location}`
    );
  } catch (e) {
    console.error(new Error("ERROR: await getPageCount()"));
    throw e;
  }
// old         `https://www.seek.com.au/${type}-jobs/in-${location}?page=${i}&salaryrange=120000-999999&salarytype=annual`

  for (let i = 1; i <= pageCount; i++) {
    try {
      const jobsPerPage = await scrapeJobAds(
        page,
        `https://www.seek.co.nz/jobs/in-${location}?page=${i}`
      );
      allJobsArr.push(...jobsPerPage);
    } catch (e) {
      console.error(new Error("ERROR: await scrapeJobAds()"));
      throw e;
    }
  }

  return allJobsArr;
}

module.exports = scrapeJobListing;
