const puppeteer = require("puppeteer");
const fs = require("fs");
const fastcsv = require("fast-csv");
const path = require("path");
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const todayDate = new Date().toISOString().split('T')[0];
const baseUrls = {
  nz: "https://www.seek.co.nz/jobs-in-information-communication-technology",
  au: "https://www.seek.com.au/jobs-in-information-communication-technology"
};
const dateRange = 1; // Adjust this as necessary 1 is today, 3 is past three days
const salaryRange = '80000-';
const salaryType = 'annual';

function constructUrl(baseURL, page, dateRange, salaryRange, salaryType) {
  let url = `${baseURL}?page=${page}`;
  if (dateRange) {
    url += `&daterange=${dateRange}`;
  }
  if (salaryRange) {
    url += `&salaryrange=${salaryRange}`;
  }
  if (salaryType) {
    url += `&salarytype=${salaryType}`;
  }
  return url;
}

async function updateCSVwithComms(filePath, updatedJobs) {
  const ws = fs.createWriteStream(filePath, { flags: 'a', includeEndRowDelimiter: true });
  fastcsv
    .write(updatedJobs, { headers: false, includeEndRowDelimiter: true })
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

async function processJobs(newJobs, existingJobs, domain) {
  const today = new Date().toISOString().split('T')[0].split('-').reverse().join('/');
  const emailLastSent = {};

  console.log("Processing jobs...");

  for (const job of existingJobs) {
    if (job.email && job.comms) {
      emailLastSent[job.email] = job.comms;
    }
  }

  for (let job of newJobs) {
    if (job.email && emailLastSent[job.email]) {
      job.comms = emailLastSent[job.email];
    }
  }

  return [...newJobs];
}

async function processJobsAndSendEmails(newJobs, existingJobs, domain) {
  const today = new Date().toISOString().split('T')[0].split('-').reverse().join('/');
  const emailLastSent = {};

  console.log("Processing jobs and sending emails...");

  for (const job of existingJobs) {
    if (job.email && job.comms) {
      emailLastSent[job.email] = job.comms;
    }
  }

  for (let job of newJobs) {
    if (job.email && !job.comms && (!emailLastSent[job.email] || !isWithinLastThreeMonths(emailLastSent[job.email]))) {
      // await sendEmail(job.email, job.company, job.title, domain);
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
  const bannedDomains = ["@thedrivegroup.com.au", "@parrismills.co.nz", "@examplebanned.com"];
  const isBanned = bannedDomains.some(bannedDomain => toEmail.endsWith(bannedDomain));
  if (isBanned) {
    console.log(`Email to ${toEmail} not sent: Domain is banned.`);
    return;
  }
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
      For more details about our services and benefits, please visit ask us for a no obligation demo.
      To take advantage of this offer, simply reply "yes", and we will do the mahi, set up your account and post your jobs for you.\n\n
      Looking forward to helping you streamline your hiring process.\n\n
      Kind regards,\n
      Nelly at Necta\n`
  };

  const messageAu = {
    to: toEmail,
    from: 'nelly@necta.nz',
    subject: `${jobTitle}`,
    text: `Morning ${companyName} Team! \n\n 
    I am Nelly from Necta, an AI job listing platform.\n\n 
    We understand that there's been a significant rise in the cost of job boards like Seek and LinkedIn. 
    In these challenging times, we're reaching out to reduce talent acquisition costs and time to hire while removing unconcious bias.\n\n 
    We are excited to say that Necta is getting ready to launch and we are looking for 100 innovators to give a six-month free trial to. This allows unlimited job listings with our job listing board, valued at $1800.\n\n
    This is an opportunity to experience our service for ${jobTitle} and any other hiring needs you might have with no risk.\n\n
    After the trial, should you choose to continue, our service is available at an affordable rate of $300 a month (not per listing). 
    For more details about our services and benefits, please visit our website or feel free to ask any questions.
    To take advantage of this offer, simply reply "yes", and we will do the work, set up your account and post your jobs for you and market them across social media.\n\n
    Looking forward to helping you streamline your hiring process.\n\n
    Kind regards,\n
    Nelly at Necta\n`
  };

  const message = domain === 'nz' ? messageNz : messageAu;

  try {
    await sgMail.send(message);
    console.log(`Email sent to ${toEmail}`);
  } catch (error) {
    console.error(`Error sending email to ${toEmail}:`, error);
  }
}

async function scrapeAllJobs(domain, type) {
  let currentPage = 1;
  let allJobs = [];
  let hasMorePages = true;
  const baseURL = `${baseUrls[domain]}/${type}`;

  console.log(`Scraping jobs from ${baseURL}`);

  while (hasMorePages) {
    const pageURL = constructUrl(baseURL, currentPage, dateRange, salaryRange, salaryType);
    console.log(`Scraping page: ${pageURL}`);
    
    const jobsOnPage = await scrapeJobPage(pageURL, type);

    if (jobsOnPage.length === 0) {
      hasMorePages = false;
    } else {
      allJobs = allJobs.concat(jobsOnPage);
      currentPage++;
    }
  }

  console.log(`Total jobs scraped: ${allJobs.length}`);
  return allJobs;
}

async function scrapeEmailFromJobPage(jobUrl) {
  const browser = await puppeteer.launch({ headless: true, timeout: 90000 });
  const page = await browser.newPage();
  await page.goto(jobUrl, { timeout: 90000 });

  const contactInfo = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/;
    const phoneRegex = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/;  // Simple pattern for US-like phone numbers
    const emailMatch = bodyText.match(emailRegex);
    const phoneMatch = bodyText.match(phoneRegex);

    const descriptionElem = document.querySelector('div[data-automation="jobAdDetails"]');
    const fullDescription = descriptionElem ? descriptionElem.innerText.replace(/\n/g, ' ') : "";

    const classificationElem = document.querySelector('span[data-automation="job-detail-classifications"]');
    const jobClassification = classificationElem ? classificationElem.innerText : "";

    return {
      email: emailMatch ? emailMatch[0] : null,
      phone: phoneMatch ? phoneMatch[0] : null,
      fullDescription: fullDescription,
      jobClassification: jobClassification
    };
  });

  await browser.close();
  // console.log(`Scraped contact info from ${jobUrl}`);
  return contactInfo;
}

async function scrapeJobPage(url, jobType) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(90000);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
  const todayDate = new Date().toISOString().split('T')[0];
  const jobs = await page.evaluate((todayDate, jobType) => {
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
    const regexEmail = /[\w.-]+@[\w.-]+\.\w+/;
    const regexPhone = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/;
    const pElems = document.querySelectorAll('p');
    const titleElems = document.querySelectorAll('a[data-automation="jobTitle"]');
    const companyElems = document.querySelectorAll('a[data-automation="jobCompany"]');
    const shortDescriptionElems = document.querySelectorAll('span[data-automation="jobShortDescription"]');
    const listingDateElems = document.querySelectorAll('span[data-automation="jobListingDate"]');
    const locationElements = document.querySelectorAll('a[data-automation="jobLocation"]');
    const salaryElems = document.querySelectorAll('span[data-automation="jobSalary"]');
    let locationCity = '';
    let locationRegion = '';
    const todayDate2 = new Date().toISOString().split('T')[0];
    if (locationElements.length >= 2) {
      locationCity = locationElements[0].innerText;   // First item for city
      locationRegion = locationElements[1].innerText; // Second item for region
    } else if (locationElements.length === 1) {
      locationCity = locationElements[0].innerText;   // Only one item, assuming it's the city
      // locationRegion remains an empty string as there's no second item
    }
    const jobsArr = [];
    for (let i = 0; i < titleElems.length; i++) {
      let locationCity = '';
      let locationRegion = '';

      if (locationElements.length >= 2) {
        locationCity = locationElements[0].innerText;   // First item for city
        locationRegion = locationElements[1].innerText; // Second item for region
      } else if (locationElements.length === 1) {
        locationCity = locationElements[0].innerText;   // Only one item, assuming it's the city
        // locationRegion remains an empty string as there's no second item
      }
      let salary = '';
      if (salaryElems[i]) {
        salary = salaryElems[i].innerText.trim();
      }

      let jobObject = {
        title: titleElems[i] ? titleElems[i].innerText : "",
        company: companyElems[i] ? companyElems[i].innerText : "",
        description: shortDescriptionElems[i] ? shortDescriptionElems[i].innerText : "",
        link: titleElems[i] ? titleElems[i].href : "",
        listedOn: listingDateElems[i] ? formatDate(listingDateElems[i].innerText) : "",
        email: null,
        phone: null,
        city: locationCity,    // Adding city
        region: locationRegion,
        salary: salary,
        runDate: todayDate || todayDate2,
        jobType: jobType,
        fullDescription: "",
        jobClassification: "",
        comms: ""
      };

      for (let pElem of pElems) {
        const emailMatch = pElem.innerText.match(regexEmail);
        const phoneMatch = pElem.innerText.match(regexPhone);
        if (emailMatch) jobObject.email = emailMatch[0];
        if (phoneMatch) jobObject.phone = phoneMatch[0];
        if (emailMatch || phoneMatch) break; // Stop searching if either is found
      }

      jobsArr.push(jobObject);
    }

    return jobsArr;
  }, todayDate, jobType);

  await browser.close();
  console.log(`Scraped jobs from page: ${url}`);
  return jobs;
}

async function readExistingJobsFromCSV(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.log(`CSV file not found: ${filePath}`);
      resolve([]);
      return;
    }

    const jobs = [];
    fs.createReadStream(filePath)
      .pipe(fastcsv.parse({ headers: true }))
      .on("data", row => jobs.push(row))
      .on("end", () => {
        console.log(`Read ${jobs.length} existing jobs from CSV`);
        resolve(jobs);
      })
      .on("error", error => {
        console.error(`Error reading CSV file: ${error}`);
        reject(error);
      });
  });
}

async function saveJobsToCSV(jobsToAdd, filePath) {
  const existingJobs = await readExistingJobsFromCSV(filePath);
  console.log(`Existing jobs count: ${existingJobs.length}`);

  // Ensure existingJobs is always an array
  const existingJobsArray = Array.isArray(existingJobs) ? existingJobs : [];

  // Only append new jobs that do not exist in the CSV yet
  const jobsToAppend = jobsToAdd.filter(newJob =>
    !existingJobsArray.some(existingJob =>
      existingJob.title === newJob.title && existingJob.company === newJob.company
    )
  );

  console.log(`New jobs to append: ${jobsToAppend.length}`);

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
    const date = new Date().toISOString().split('T')[0].split('-').reverse().join('');
    const newFilePath = jobsCsvFilePath.replace('.csv', `_${date}.csv`);

    for (const jobType of ['full-time', 'contract-temp']) {
      const existingJobs = await readExistingJobsFromCSV(jobsCsvFilePath);
      console.log(`Processing ${domain} jobs (${jobType})`);
      
      const scrapedJobs = await scrapeAllJobs(domain, jobType);
      console.log(`Scraped ${scrapedJobs.length} ${jobType} jobs for ${domain}`);

      // Get emails, full description, and job classification for scraped jobs
      for (let job of scrapedJobs) {
        if (job.link) {
          const contactDetails = await scrapeEmailFromJobPage(job.link);
          job.email = contactDetails.email;
          job.phone = contactDetails.phone;
          job.fullDescription = contactDetails.fullDescription;
          job.jobClassification = contactDetails.jobClassification;
        }
      }

      // Filter out jobs that already exist in CSV
      const newJobs = scrapedJobs.filter(scrapedJob =>
        !existingJobs.some(existingJob =>
          existingJob.title === scrapedJob.title && existingJob.company === scrapedJob.company
        )
      );

      // Process new jobs for sending emails and updating comms field
      const processedNewJobs = await processJobsAndSendEmails(newJobs, existingJobs || []);
      const processedNewJobsOnly = await processJobs(newJobs, existingJobs || []);

      // Append new jobs to the existing CSV
      await saveJobsToCSV(processedNewJobs, jobsCsvFilePath);
      // Append new jobs with contact to the new CSV file
      const jobsWithContact = processedNewJobsOnly.filter(job => job.email || job.phone);
      await updateCSVwithComms(newFilePath, jobsWithContact);
    }
  }

  console.log("Job scraping and email process completed.");
})();
