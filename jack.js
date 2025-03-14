const puppeteer = require("puppeteer");
const fs = require("fs");
const fastcsv = require("fast-csv");
const path = require("path");
require('dotenv').config();

async function scrapeJobPage(url, jobType = "") {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(90000);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
  const todayDate = new Date().toISOString().split('T')[0];
  
  const jobs = await page.evaluate((todayDate, jobType) => {
    // Regular expressions for email and phone extraction
    const regexEmail = /[\w.-]+@[\w.-]+\.\w+/;
    const regexPhone = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/;
    
    // Select all the job elements on the page
    const titleElems = document.querySelectorAll('a[data-automation="jobTitle"]');
    const companyElems = document.querySelectorAll('a[data-automation="jobCompany"]');
    const shortDescriptionElems = document.querySelectorAll('span[data-automation="jobShortDescription"]');
    const listingDateElems = document.querySelectorAll('span[data-automation="jobListingDate"]');
    const locationElements = document.querySelectorAll('a[data-automation="jobLocation"]');
    const salaryElems = document.querySelectorAll('span[data-automation="jobSalary"]');
    // Select all apply button elements on the page (assumed to be in the same order)
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
      
      // Determine the apply type based on button HTML
      let applyType = "Apply"; // default
      if (applyButtonElems[i]) {
        const buttonHTML = applyButtonElems[i].innerHTML.toLowerCase();
        if (buttonHTML.includes("quick apply")) {
          applyType = "Quick Apply";
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
        jobType: jobType,
        regionName: "",  // This will be set later
        applyType: applyType
      };

      // Optionally, extract email or phone from any <p> elements
      const pElems = document.querySelectorAll('p');
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
  }, todayDate, jobType);

  await browser.close();
  console.log(`Scraped jobs from page: ${url}`);
  return jobs;
}

// Define custom region URLs
const customRegions = {
  "Bay-of-Plenty": "https://www.seek.co.nz/jobs/in-All-Bay-of-Plenty?classification=6281%2C6008%2C7019%2C1223",
  "Wellington": "https://www.seek.co.nz/jobs/in-All-Wellington?classification=6281%2C6008%2C7019%2C1223"
};

(async () => {
  let allJobs = [];

  // Loop over each custom region URL
  for (const [regionName, baseURL] of Object.entries(customRegions)) {
    let currentPage = 1;
    let hasMorePages = true;
    console.log(`Scraping jobs for region: ${regionName}`);
    while (hasMorePages) {
      // Append the page parameter. Since the base URL already has query parameters, we use '&'
      const pageURL = baseURL + `&page=${currentPage}`;
      console.log(`Scraping page: ${pageURL}`);
      const jobsOnPage = await scrapeJobPage(pageURL);
      if (jobsOnPage.length === 0) {
        hasMorePages = false;
      } else {
        // Add region name to each job object
        jobsOnPage.forEach(job => job.regionName = regionName);
        allJobs = allJobs.concat(jobsOnPage);
        currentPage++;
      }
    }
  }

  console.log(`Total jobs scraped: ${allJobs.length}`);

  // Save combined jobs to one CSV file
  const outputPath = path.join(__dirname, "combinedJobs.csv");
  const ws = fs.createWriteStream(outputPath);
  fastcsv
    .write(allJobs, { headers: true })
    .pipe(ws)
    .on("finish", () => {
      console.log(`All jobs saved to ${outputPath}`);
    });
})();
