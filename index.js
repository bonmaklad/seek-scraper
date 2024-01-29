const puppeteer = require("puppeteer");
const fs = require("fs");
const fastcsv = require("fast-csv");
const path = require("path");
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const baseUrls = {
  nz: "https://www.seek.co.nz/jobs-in-information-communication-technology",
  au: "https://www.seek.com.au/jobs-in-information-communication-technology"
};
const dateRange = "?daterange=1";

// const baseURL = "https://www.seek.co.nz/jobs-in-information-communication-technology";
// const dateRange = "?daterange=3";

async function updateCSVwithComms(filePath, updatedJobs) {
  const ws = fs.createWriteStream(filePath, { flags: 'w', includeEndRowDelimiter: true });
  fastcsv
    .write(updatedJobs, { headers: true, includeEndRowDelimiter: true })
    .pipe(ws);
}

function parseDate(dateString) {
  const [day, month, year] = dateString.split('/').map(num => parseInt(num, 10));
  return new Date(year, month - 1, day);
}

function isWithinLastThreeMonths(dateString) {
  const date = parseDate(dateString);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return date >= threeMonthsAgo;
}


async function processJobsAndSendEmails(newJobs, existingJobs, domain) {
  const today = new Date().toISOString().split('T')[0].split('-').reverse().join('/');
  const emailLastSent = {};

  for (const job of existingJobs) {
    if (job.email && job.comms) {
      emailLastSent[job.email] = job.comms;
    }
  }

  for (let job of newJobs) {
    if (job.email && !job.comms && (!emailLastSent[job.email] || !isWithinLastThreeMonths(emailLastSent[job.email]))) {
      await sendEmail(job.email, job.company, job.title, domain);
      job.comms = today;
      emailLastSent[job.email] = today;
    }
  }

  for (let job of existingJobs) {
    if (job.email && emailLastSent[job.email]) {
      job.comms = emailLastSent[job.email];
    }
  }

  return [...existingJobs, ...newJobs];
}

async function sendEmail(toEmail, companyName, jobTitle, domain) {
  const messageNz = {
      to: toEmail,
      from: 'nelly@necta.nz',
      subject: `${jobTitle}`,
      text: `Kia Ora ${companyName} Team! \n\n 
      I am Nelly from Necta, a Kiwi-operated job listing platform.\n\n 
      We understand that there's been a significant rise in the cost of job boards like Seek, Trade Me, and LinkedIn. 
      In these challenging times, we're reaching out as Kiwis to help Kiwis reduce talent acquisition costs.\n\n 
      We are excited to offer you a three-month free trial for unlimited job listings with our job listing board, valued at $900.\n\n
      This is an opportunity to experience our service for ${jobTitle} and any other hiring needs you might have with no risk.\n\n
      After the trial, should you choose to continue, our service is available at an affordable rate of $300 a month. 
      For more details about our services and benefits, please visit our website at https://necta.nz.
      To take advantage of this offer, simply reply "yes", and we will do the mahi, set up your account and post your jobs for you.\n\n
      Looking forward to helping you streamline your hiring process.\n\n
      Kind regards,\n
      Nelly at Necta\n
      http://necta.nz`
  };

  const messageAu = {
    to: toEmail,
    from: 'nelly@necta.nz',
    subject: `${jobTitle}`,
    text: `Kia Ora ${companyName} Team! \n\n 
    I am Nelly from Necta, an AI job listing platform.\n\n 
    We understand that there's been a significant rise in the cost of job boards like Seek and LinkedIn. 
    In these challenging times, we're reaching out to reduce talent acquisition costs and time to hire while removing unconcious bias.\n\n 
    We are excited to say that Necta is getting ready to launch and we are looking for 100 innovators to give a six-month free trial to. This allows unlimited job listings with our job listing board, valued at $1800.\n\n
    This is an opportunity to experience our service for ${jobTitle} and any other hiring needs you might have with no risk.\n\n
    After the trial, should you choose to continue, our service is available at an affordable rate of $300 a month (not per listing). 
    For more details about our services and benefits, please visit our website at https://necta.nz.
    To take advantage of this offer, simply reply "yes", and we will do the work, set up your account and post your jobs for you and market them across social media.\n\n
    Looking forward to helping you streamline your hiring process.\n\n
    Kind regards,\n
    Nelly at Necta\n
    http://necta.nz`
};


  const message = domain === 'nz' ? messageNz : messageAu;

  try {
    await sgMail.send(message);
    console.log(`Email sent to ${toEmail}`);
  } catch (error) {
    console.error(`Error sending email to ${toEmail}:`, error);
  }
}


async function scrapeAllJobs(domain) {
  let currentPage = 1;
  let allJobs = [];
  let hasMorePages = true;
  const baseURL = baseUrls[domain];

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
  const csvFilePaths = {
    nz: path.join(__dirname, "jobs.csv"),
    au: path.join(__dirname, "jobsA.csv")
  };

  for (const domain of ['nz', 'au']) {
    const jobsCsvFilePath = csvFilePaths[domain];
    
    const existingJobs = await readExistingJobsFromCSV(jobsCsvFilePath);
    const scrapedJobs = await scrapeAllJobs(domain);

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
  // console.log(existingJobs)
  // Process new jobs for sending emails and updating comms field
  const processedNewJobs = await processJobsAndSendEmails(newJobs, existingJobs);

  // // Combine existing jobs with processed new jobs
  // const combinedJobs = [...existingJobs, ...processedNewJobs];

  // Write the combined jobs to the CSV, replacing the old file
 
  await updateCSVwithComms(jobsCsvFilePath, processedNewJobs);

}

console.log("Job scraping and email process completed.");
})();