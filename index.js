const puppeteer = require("puppeteer");
const fs = require("fs");
const fastcsv = require("fast-csv");
const path = require("path");
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const baseURL = "https://www.seek.co.nz/jobs-in-information-communication-technology";
const dateRange = "?daterange=3";

async function updateCSVwithComms(filePath, updatedJobs) {
  // Ensure 'w' flag is used to overwrite the file
  const ws = fs.createWriteStream(filePath, { flags: 'w', includeEndRowDelimiter: true });
  fastcsv
    .write(updatedJobs, { headers: true, includeEndRowDelimiter: true })
    .pipe(ws);
}


function isWithinLastThreeMonths(dateString) {
  const date = new Date(dateString);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return date >= threeMonthsAgo;
}


async function processJobsAndSendEmails(existingJobs) {
  const today = new Date().toISOString().split('T')[0];
  const emailLastSent = {}; // Object to keep track of when each email was last sent

  // Populate emailLastSent with the last sent dates from existingJobs
  for (const job of existingJobs) {
      if (job.email && job.comms) {
          emailLastSent[job.email] = job.comms;
      }
  }

  for (let job of existingJobs) {
      // Check if we have sent an email to this address in the last three months
      if (job.email && !job.comms && (!emailLastSent[job.email] || !isWithinLastThreeMonths(emailLastSent[job.email]))) {
          await sendEmail(job.email, job.company, job.title);
          job.comms = today;
          emailLastSent[job.email] = today; // Update the last sent date
      }
  }

  return existingJobs;
}


async function sendEmail(toEmail, companyName, jobTitle) {
  const message = {
      to: toEmail,
      from: 'nelly@necta.nz',
      subject: `${jobTitle}`,
      text: `Kia Ora ${companyName} Team!\n\nI am Nelly from Necta, an AI job listing board that integrates with your internal hiring process. We would love to list your job opportunity with us. We can offer you a three-month free trial with our AI job listing and talent acquisition service, valued at $900, for ${jobTitle} and any hiring needs you have in the next three months.\n\nWe know how busy you are, so feel free to reply "yes", and we will set up your account and post your listing on your behalf.\n\nKind regards,\nNelly at Necta`
  };

  try {
      await sgMail.send(message);
      console.log(`Email sent to ${toEmail}`);
  } catch (error) {
      console.error(`Error sending email to ${toEmail}:`, error);
  }
}


async function scrapeAllJobs() {
  let currentPage = 1;
  let allJobs = [];
  let hasMorePages = true;

  while (hasMorePages) {
      const pageURL = `${baseURL}${dateRange}&page=${currentPage}`;
      const jobsOnPage = await scrapeJobPage(pageURL);

      if (jobsOnPage.length === 0) {
          hasMorePages = false;
      } else {
          allJobs = allJobs.concat(jobsOnPage);
          currentPage++;
      }
  }

  return allJobs;
}

async function scrapeEmailFromJobPage(jobUrl) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // page.on('console', msg => console.log(msg.text()));

  await page.goto(jobUrl);

  const email = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      // A more robust regex pattern for email matching
      const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/;
      const emailMatch = bodyText.match(emailRegex);
      // console.log('Email found:', emailMatch ? emailMatch[0] : "None");
      return emailMatch ? emailMatch[0] : null;
  });

  await browser.close();
  return email;
}






async function scrapeJobPage(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const jobs = await page.evaluate(() => {
      function subtractDaysFromDate(date, days) {
          const res = new Date(date);
          res.setDate(res.getDate() - days);
          return res;
      }

      function formatDate(string) {
        const match = string.match(/^(\d+)d$/); // Match a number followed by 'd'
        if (!match) return null; // Return null if the format is incorrect
    
        const daysAgo = parseInt(match[1], 10); // Extract number of days
        if (isNaN(daysAgo)) return null; // Return null if not a number
    
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
    }

      const regex = /[\w.-]+@[\w.-]+\.\w+/;
      const pElems = document.querySelectorAll('p');
      const titleElems = document.querySelectorAll('a[data-automation="jobTitle"]');
      const companyElems = document.querySelectorAll('a[data-automation="jobCompany"]');
      const shortDescriptionElems = document.querySelectorAll('span[data-automation="jobShortDescription"]');
      const listingDateElems = document.querySelectorAll('span[data-automation="jobListingDate"]');
      const jobsArr = [];

      for (let i = 0; i < titleElems.length; i++) {
          let jobObject = {
              title: titleElems[i] ? titleElems[i].innerText : "",
              company: companyElems[i] ? companyElems[i].innerText : "",
              description: shortDescriptionElems[i] ? shortDescriptionElems[i].innerText : "",
              link: titleElems[i] ? titleElems[i].href : "",
              listedOn: listingDateElems[i] ? formatDate(listingDateElems[i].innerText) : "",
              email: null
          };

          for (let pElem of pElems) {
              const emailMatch = pElem.innerText.match(regex);
              if (emailMatch) {
                  jobObject.email = emailMatch[0];
                  break;
              }
          }

          jobsArr.push(jobObject);
      }

      return jobsArr;
  });

  await browser.close();
  return jobs;
}


async function readExistingJobsFromCSV(filePath) {
  return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
          resolve([]);
          return;
      }

      const jobs = [];
      fs.createReadStream(filePath)
          .pipe(fastcsv.parse({ headers: true }))
          .on("data", row => jobs.push(row))
          .on("end", () => resolve(jobs))
          .on("error", error => reject(error));
  });
}

async function saveJobsToCSV(jobsToAdd, filePath) {
  const existingJobs = await readExistingJobsFromCSV(filePath);
  
  // Only append new jobs that do not exist in the CSV yet
  const jobsToAppend = jobsToAdd.filter(newJob => 
      !existingJobs.some(existingJob => 
          existingJob.title === newJob.title && existingJob.company === newJob.company
      )
  );

  if (jobsToAppend.length > 0) {
      // Append new jobs to the CSV
      const ws = fs.createWriteStream(filePath, { flags: 'a', includeEndRowDelimiter: true });
      fastcsv
          .write(jobsToAppend, { headers: false, includeEndRowDelimiter: true })
          .pipe(ws);
  }
}

(async () => {
  const jobsCsvFilePath = path.join(__dirname, "jobs.csv");
  
  // Read existing jobs from CSV
  const existingJobs = await readExistingJobsFromCSV(jobsCsvFilePath);
  
  // Scrape new jobs
  const scrapedJobs = await scrapeAllJobs();

  // Get emails for scraped jobs
  for (let job of scrapedJobs) {
    if (job.link) {
      job.email = await scrapeEmailFromJobPage(job.link);
    }
  }

  // Filter out jobs that already exist in CSV
  const newJobs = scrapedJobs.filter(scrapedJob => 
    !existingJobs.some(existingJob => 
      existingJob.title === scrapedJob.title && existingJob.company === scrapedJob.company
    )
  );

  // Process new jobs for sending emails and updating comms field
  const processedNewJobs = await processJobsAndSendEmails(newJobs);

  // Combine existing jobs with processed new jobs
  const combinedJobs = [...existingJobs, ...processedNewJobs];

  // Write the combined jobs to the CSV, replacing the old file
  await updateCSVwithComms(jobsCsvFilePath, combinedJobs);

  console.log("Job scraping and email process completed.");
})();