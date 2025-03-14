const puppeteer = require("puppeteer");
const fs = require("fs");
const fastcsv = require("fast-csv");
const path = require("path");
require("dotenv").config();

const BATCH_SIZE = 500;
const BASE_URL = "https://www.seek.co.nz/jobs";

// Function to scrape a listing page for jobs
async function scrapeJobPage(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(90000);
  await page.goto(url, { waitUntil: "networkidle0", timeout: 90000 });
  const todayDate = new Date().toISOString().split("T")[0];

  const jobs = await page.evaluate((todayDate) => {
    const regexEmail = /[\w.-]+@[\w.-]+\.\w+/;
    const regexPhone = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/;
    const titleElems = document.querySelectorAll('a[data-automation="jobTitle"]');
    const companyElems = document.querySelectorAll('a[data-automation="jobCompany"]');
    const shortDescriptionElems = document.querySelectorAll('span[data-automation="jobShortDescription"]');
    const listingDateElems = document.querySelectorAll('span[data-automation="jobListingDate"]');
    const locationElements = document.querySelectorAll('a[data-automation="jobLocation"]');
    const salaryElems = document.querySelectorAll('span[data-automation="jobSalary"]');
    const applyButtonElems = document.querySelectorAll('a[data-automation="job-detail-apply"]');

    let jobsArr = [];
    for (let i = 0; i < titleElems.length; i++) {
      let locationCity = "";
      let locationRegion = "";
      if (locationElements.length >= 2) {
        locationCity = locationElements[0].innerText;
        locationRegion = locationElements[1].innerText;
      } else if (locationElements.length === 1) {
        locationCity = locationElements[0].innerText;
      }

      // Determine initial apply type based on the apply button info
      let applyType = "Apply";
      if (applyButtonElems[i]) {
        const target = applyButtonElems[i].getAttribute("target");
        if (target && target === "_self") {
          applyType = "Quick Apply";
        } else {
          const buttonHTML = applyButtonElems[i].innerHTML.toLowerCase();
          const buttonText = applyButtonElems[i].innerText.toLowerCase();
          if (buttonHTML.includes("quick apply") || buttonText.includes("quick apply")) {
            applyType = "Quick Apply";
          }
        }
      }

      let jobObject = {
        title: titleElems[i] ? titleElems[i].innerText : "",
        company: companyElems[i] ? companyElems[i].innerText : "",
        description: shortDescriptionElems[i] ? shortDescriptionElems[i].innerText : "",
        link: titleElems[i] ? titleElems[i].href : "",
        listedOn: listingDateElems[i] ? listingDateElems[i].innerText : "",
        email: null,
        phone: null,
        city: locationCity,
        region: locationRegion,
        salary: salaryElems[i] ? salaryElems[i].innerText.trim() : "",
        runDate: todayDate,
        jobType: "",
        regionName: "",
        applyType: applyType
      };

      // Attempt to extract an email or phone from <p> elements
      const pElems = document.querySelectorAll("p");
      for (let pElem of pElems) {
        const emailMatch = pElem.innerText.match(regexEmail);
        const phoneMatch = pElem.innerText.match(regexPhone);
        if (emailMatch) jobObject.email = emailMatch[0];
        if (phoneMatch) jobObject.phone = phoneMatch[0];
        if (emailMatch || phoneMatch) break;
      }
      jobsArr.push(jobObject);
    }
    return jobsArr;
  }, todayDate);

  await browser.close();
  console.log(`Scraped jobs from page: ${url}`);
  return jobs;
}

// Function to scrape the job detail page to update the apply type
async function getApplyTypeFromJobDetail(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(90000);
  try {
    await page.goto(url, { waitUntil: "networkidle0", timeout: 90000 });
    await page.waitForSelector('a[data-automation="job-detail-apply"]', { timeout: 5000 });
  } catch (err) {
    console.error(`Error loading job detail for ${url}: ${err}`);
    await browser.close();
    return "Apply"; // fallback value in case of an error
  }
  const applyType = await page.evaluate(() => {
    const btn = document.querySelector('a[data-automation="job-detail-apply"]');
    let type = "Apply";
    if (btn) {
      const target = btn.getAttribute("target");
      if (target && target === "_self") {
        type = "Quick Apply";
      } else if (btn.innerText && btn.innerText.toLowerCase().includes("quick apply")) {
        type = "Quick Apply";
      }
    }
    return type;
  });
  await browser.close();
  return applyType;
}

// Process a batch of jobs: update each job’s apply type and write it to the CSV stream
async function processBatch(jobsBatch, csvStream) {
  for (let job of jobsBatch) {
    try {
      const detailApplyType = await getApplyTypeFromJobDetail(job.link);
      job.applyType = detailApplyType;
      console.log(`Updated job "${job.title}" with apply type: ${detailApplyType}`);
    } catch (err) {
      console.error(`Error updating job "${job.title}": ${err}`);
    }
    csvStream.write(job);
  }
}

(async () => {
  // Setup CSV streaming so we can write incrementally
  const outputPath = path.join(__dirname, "combinedJobs.csv");
  const ws = fs.createWriteStream(outputPath);
  const csvStream = fastcsv.format({ headers: true });
  csvStream.pipe(ws).on("finish", () => {
    console.log(`All jobs saved to ${outputPath}`);
  });

  let currentPage = 1;
  let hasMorePages = true;
  let batch = [];

  // Loop through paginated job listing pages
  while (hasMorePages) {
    const pageURL = `${BASE_URL}?page=${currentPage}`;
    console.log(`Scraping page: ${pageURL}`);
    const jobsOnPage = await scrapeJobPage(pageURL);
    if (jobsOnPage.length === 0) {
      hasMorePages = false;
      console.log("No more jobs found on page, ending pagination.");
    } else {
      // Accumulate jobs into the batch
      batch = batch.concat(jobsOnPage);
      console.log(`Collected ${batch.length} jobs so far in current batch.`);
      // Process the batch if it reaches (or exceeds) the BATCH_SIZE
      if (batch.length >= BATCH_SIZE) {
        console.log(`Processing batch of ${batch.length} jobs.`);
        await processBatch(batch, csvStream);
        batch = []; // clear batch to free memory
      }
      currentPage++;
    }
  }

  // Process any remaining jobs that didn't complete a full batch
  if (batch.length > 0) {
    console.log(`Processing final batch of ${batch.length} jobs.`);
    await processBatch(batch, csvStream);
  }

  csvStream.end();
})();
