const puppeteer = require('puppeteer');
const fs = require('fs');
const csv = require('csv-parser'); // For reading existing CSV file
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  
  // Create a function to initialize a new page with desired settings.
  async function newPageWithSettings() {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });
    return page;
  }
  
  // Create the listings page.
  let listingPage = await newPageWithSettings();
  
  let allJobListings = [];
  let pageNumber = 1;
  let morePages = true;
  
  // Loop through pages until no job cards are found.
  while (morePages) {
    // Every 10 pages, close and reopen the listings page.
    if (pageNumber > 1 && (pageNumber - 1) % 10 === 0) {
      console.log(`Reinitializing listings page at page ${pageNumber}`);
      await listingPage.close();
      listingPage = await newPageWithSettings();
    }
    
    // Use the URL format that works for you.
    const url = `https://www.trademe.co.nz/a/jobs/search?sort_order=expirydesc?page=${pageNumber}`;
    console.log(`Scraping ${url}...`);
    try {
      await listingPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch (navErr) {
      console.error(`Navigation error on ${url}:`, navErr);
      // Continue even if navigation fails; the page might have partially loaded.
    }
    
    // Wait to allow dynamic content to load.
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const jobListings = await listingPage.evaluate(() => {
      const listings = [];
      const jobCards = document.querySelectorAll('a.tm-promoted-listing-card__link');
      jobCards.forEach(card => {
        // Extract job title (remove "-" and anything following)
        const titleEl = card.querySelector('div#promoted-listing-title');
        let title = titleEl ? titleEl.innerText.trim() : '';
        if (title.includes('-')) {
          title = title.split('-')[0].trim();
        }
  
        // Extract short description.
        const descEl = card.querySelector('div#promoted-listing-description');
        const shortDescription = descEl ? descEl.innerText.trim() : '';
  
        // Extract city and region.
        const locationEl = card.querySelector('[tmid="location"]');
        let city = '', region = '';
        if (locationEl) {
          const parts = locationEl.innerText.trim().split(',');
          if (parts.length >= 2) {
            city = parts[0].trim();
            region = parts[1].trim();
          }
        }
  
        // Build the full URL for the job detail page.
        let link = card.getAttribute('href');
        if (link) {
          link = link.split('?')[0];
          if (!link.startsWith('http')) {
            link = 'https://www.trademe.co.nz/a/' + link;
          }
        }
  
        listings.push({ title, shortDescription, city, region, link });
      });
      return listings;
    });
  
    console.log(`Found ${jobListings.length} jobs on page ${pageNumber}.`);
    if (jobListings.length === 0) {
      morePages = false;
    } else {
      allJobListings.push(...jobListings);
      pageNumber++;
    }
  }
  
  console.log(`Total job listings found: ${allJobListings.length}`);
  
  // Create a detail page.
  let detailPage = await newPageWithSettings();
  let detailCounter = 0;
  
  // Loop over each job listing to fetch additional details.
  for (const listing of allJobListings) {
    detailCounter++;
    // Every 10 detail fetches, close and reopen the detail page.
    if (detailCounter > 1 && (detailCounter - 1) % 10 === 0) {
      console.log(`Reinitializing detail page at record ${detailCounter}`);
      await detailPage.close();
      detailPage = await newPageWithSettings();
    }
  
    console.log(`Fetching details for ${listing.link}`);
    try {
      await detailPage.goto(listing.link, { waitUntil: 'networkidle2', timeout: 60000 });
      await detailPage.waitForSelector('h2.jb-listing__company-name', { timeout: 30000 });
  
      const details = await detailPage.evaluate(() => {
        const companyEl = document.querySelector('h2.jb-listing__company-name');
        const company = companyEl ? companyEl.innerText.trim() : '';
  
        let jobType = '';
        const jobTypeContainer = Array.from(document.querySelectorAll('.o-rack-item__main'))
          .find(el => el.innerText.includes('Job type'));
        if (jobTypeContainer) {
          const secondary = jobTypeContainer.querySelector('.o-rack-item__secondary');
          jobType = secondary ? secondary.innerText.trim() : '';
        }
  
        let duration = '';
        const durationContainer = Array.from(document.querySelectorAll('.o-rack-item__main'))
          .find(el => el.innerText.includes('Duration'));
        if (durationContainer) {
          const secondary = durationContainer.querySelector('.o-rack-item__secondary');
          duration = secondary ? secondary.innerText.trim() : '';
        }
        
        let salary = '';
        const salaryContainer = Array.from(document.querySelectorAll('.o-rack-item__main'))
          .find(el => el.innerText.includes('Company benefits'));
        if (salaryContainer) {
          const secondary = salaryContainer.querySelector('.o-rack-item__secondary');
          salary = secondary ? secondary.innerText.trim() : '';
        }
  
        const fullDescEl = document.querySelector('div.tm-markdown');
        const fullDescription = fullDescEl ? fullDescEl.innerText.trim() : '';
  
        const buttonEl = document.querySelector('button.tm-jobs-listing-apply-button__apply-button');
        const buttonText = buttonEl ? buttonEl.innerText.trim() : '';
  
        return { company, jobType, duration, salary, fullDescription, buttonText };
      });
  
      listing.company = details.company;
      listing.jobType = details.jobType;
      listing.duration = details.duration;
      listing.salary = details.salary;
      listing.fullDescription = details.fullDescription;
      listing.buttonText = details.buttonText;
    } catch (err) {
      console.error(`Error fetching details for ${listing.link}:`, err.stack);
      listing.company = '';
      listing.jobType = '';
      listing.duration = '';
      listing.salary = '';
      listing.fullDescription = '';
      listing.buttonText = '';
    }
  }
  
  await detailPage.close();
  await listingPage.close();
  await browser.close();
  
  // Read the existing CSV file (if any)
  const csvFilePath = 'jobListingstrademe.csv';
  let existingRecords = [];
  if (fs.existsSync(csvFilePath)) {
    existingRecords = await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }
  
  const existingLinks = new Set(existingRecords.map(record => record.Link));
  const newRecords = allJobListings.filter(listing => !existingLinks.has(listing.link));
  
  // Add extra fields: Listed On (today's date), Job Board ("TradeMe"), and
  // extract classification/subclassification from the URL.
  const today = new Date().toISOString().split('T')[0];
  newRecords.forEach(record => {
    record.listedOn = today;
    record.jobBoard = 'TradeMe';
    const base = "https://www.trademe.co.nz/a/jobs/";
    if (record.link.startsWith(base)) {
      const parts = record.link.slice(base.length).split('/');
      record.classification = parts[0] || '';
      record.subclassification = parts[1] || '';
    } else {
      record.classification = '';
      record.subclassification = '';
    }
  });
  
  const csvWriter = createCsvWriter({
    path: csvFilePath,
    header: [
      { id: 'title', title: 'Job Title' },
      { id: 'shortDescription', title: 'Short Description' },
      { id: 'city', title: 'City' },
      { id: 'region', title: 'Region' },
      { id: 'link', title: 'Link' },
      { id: 'classification', title: 'Classification' },
      { id: 'subclassification', title: 'Subclassification' },
      { id: 'company', title: 'Company' },
      { id: 'jobType', title: 'Job Type' },
      { id: 'duration', title: 'Duration' },
      { id: 'salary', title: 'Salary' },
      { id: 'fullDescription', title: 'Full Description' },
      { id: 'buttonText', title: 'Apply Button Text' },
      { id: 'listedOn', title: 'Listed On' },
      { id: 'jobBoard', title: 'Job Board' }
    ],
    append: fs.existsSync(csvFilePath)
  });
  
  await csvWriter.writeRecords(newRecords);
  console.log(`${newRecords.length} new job listing(s) appended to ${csvFilePath}`);
})();
