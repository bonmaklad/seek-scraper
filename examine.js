const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  const url = "https://www.seek.co.nz/jobs-in-accounting/accounts-officers-clerks?page=1";
  const browser = await puppeteer.launch({ headless: true }); // show browser
  const page = await browser.newPage();

  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

  try {
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait for job cards to appear
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 15000 });

    const result = await page.evaluate(() => {
      const jobCards = document.querySelectorAll('[data-testid="job-card"]');
      const summary = [];

      jobCards.forEach(card => {
        const title = card.querySelector('[data-automation="jobTitle"]')?.innerText || "No title";
        const company = card.querySelector('[data-automation="jobCompany"]')?.innerText || "No company";
        const location = card.querySelector('[data-automation="jobLocation"]')?.innerText || "No location";
        summary.push({ title, company, location });
      });

      return {
        totalCards: jobCards.length,
        firstFew: summary.slice(0, 5)
      };
    });

    console.log("\n===== SEEK PAGE SNAPSHOT =====");
    console.log(`Total job cards: ${result.totalCards}`);
    console.table(result.firstFew);

    // Save raw HTML to inspect manually
    const rawHTML = await page.content();
    fs.writeFileSync(path.join(__dirname, "seek_snapshot.html"), rawHTML);
    console.log("\nSaved snapshot to seek_snapshot.html ✅");

  } catch (err) {
    console.error("Error examining page:", err.message);
  } finally {
    await browser.close();
  }
})();
