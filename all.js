const puppeteer = require("puppeteer");
const fs = require("fs");
const fastcsv = require("fast-csv");
const path = require("path");
const { JSDOM } = require("jsdom");
require('dotenv').config();

const todayDate = new Date().toISOString().split('T')[0];

const baseUrls = {
  accountingClerks : "https://www.seek.co.nz/jobs-in-accounting/accounts-officers-clerks",
  accountingPayable : "https://www.seek.co.nz/jobs-in-accounting/accounts-payable",
  accountingCredit : "https://www.seek.co.nz/jobs-in-accounting/accounts-receivable-credit-control",
  accountingAnalysis : "https://www.seek.co.nz/jobs-in-accounting/analysis-reporting",
  accountingAssistant : "https://www.seek.co.nz/jobs-in-accounting/assistant-accountants",
  accountingAudit : "https://www.seek.co.nz/jobs-in-accounting/audit-external",
  accountingAudit2 : "https://www.seek.co.nz/jobs-in-accounting/audit-internal",
  accountingBookkeeping : "https://www.seek.co.nz/jobs-in-accounting/bookkeeping-small-practice-accounting",
  accountingAdvisory : "https://www.seek.co.nz/jobs-in-accounting/business-services-corporate-advisory",
  accountingCompliance : "https://www.seek.co.nz/jobs-in-accounting/compliance-risk",
  accountingCost : "https://www.seek.co.nz/jobs-in-accounting/cost-accounting",
  accountingFinancial : "https://www.seek.co.nz/jobs-in-accounting/financial-accounting-reporting",
  accountingFinancialManagement : "https://www.seek.co.nz/jobs-in-accounting/financial-managers-controllers",
  accountingCorporate : "https://www.seek.co.nz/jobs-in-accounting/insolvency-corporate-recovery",
  accountingFixed : "https://www.seek.co.nz/jobs-in-accounting/inventory-fixed-assets",
  accountingManagement2 : "https://www.seek.co.nz/jobs-in-accounting/management",
  accountingManagement3 : "https://www.seek.co.nz/jobs-in-accounting/management-accounting-budgeting",
  accountingPayroll : "https://www.seek.co.nz/jobs-in-accounting/payroll",
  accountingStrategy : "https://www.seek.co.nz/jobs-in-accounting/strategy-planning",
  accountingItAudit : "https://www.seek.co.nz/jobs-in-accounting/systems-accounting-it-audit",
  accountingStrategy : "https://www.seek.co.nz/jobs-in-accounting/taxation",
  accountingTreasury : "https://www.seek.co.nz/jobs-in-accounting/treasury",
  accountingOther : "https://www.seek.co.nz/jobs-in-accounting/other",
  adminAssistants : "https://www.seek.co.nz/jobs-in-administration-office-support/administrative-assistants",
  adminClient : "https://www.seek.co.nz/jobs-in-administration-office-support/client-sales-administration",
  adminContracts : "https://www.seek.co.nz/jobs-in-administration-office-support/contracts-administration",
  adminDataEntry : "https://www.seek.co.nz/jobs-in-administration-office-support/data-entry-word-processing",
  adminOfficeManagement : "https://www.seek.co.nz/jobs-in-administration-office-support/office-management",
  adminPa : "https://www.seek.co.nz/jobs-in-administration-office-support/pa-ea-secretarial",
  adminReception : "https://www.seek.co.nz/jobs-in-administration-office-support/receptionists",
  adminRecords : "https://www.seek.co.nz/jobs-in-administration-office-support/records-management-document-control",
  adminOther : "https://www.seek.co.nz/jobs-in-administration-office-support/records-management-document-control",
  advertisement : "https://www.seek.co.nz/jobs-in-advertising-arts-media",
  banking : "https://www.seek.co.nz/jobs-in-banking-financial-services",
  callCentre : "https://www.seek.co.nz/jobs-in-call-centre-customer-service",
  ceo : "https://www.seek.co.nz/jobs-in-ceo-general-management",
  consulting : "https://www.seek.co.nz/jobs-in-consulting-strategy",
  design : "https://www.seek.co.nz/jobs-in-design-architecture",
  education : "https://www.seek.co.nz/jobs-in-education-training",
  farming : "https://www.seek.co.nz/jobs-in-farming-animals-conservation",
  hr : "https://www.seek.co.nz/jobs-in-human-resources-recruitment",
  insurance : "https://www.seek.co.nz/jobs-in-insurance-superannuation",
  legal : "https://www.seek.co.nz/jobs-in-legal",
  marketing : "https://www.seek.co.nz/jobs-in-marketing-communications",
  mining : "https://www.seek.co.nz/jobs-in-mining-resources-energy",
  realestate : "https://www.seek.co.nz/jobs-in-real-estate-property",
  science : "https://www.seek.co.nz/jobs-in-science-technology",
  sport : "https://www.seek.co.nz/jobs-in-sport-recreation",
  communityAge : "https://www.seek.co.nz/jobs-in-community-services-development/aged-disability-support",
  communityChild : "http://seek.co.nz/jobs-in-community-services-development/child-welfare-youth-family-services",
  communityDevelopment : "https://www.seek.co.nz/jobs-in-community-services-development/community-development",
  communityServices : "https://www.seek.co.nz/jobs-in-community-services-development/employment-services",
  communityFund : "https://www.seek.co.nz/jobs-in-community-services-development/fundraising",
  communityHousing : "https://www.seek.co.nz/jobs-in-community-services-development/housing-homelessness-services",
  communityCulture : "https://www.seek.co.nz/jobs-in-community-services-development/indigenous-multicultural-services",
  communityManagement : "https://www.seek.co.nz/jobs-in-community-services-development/management",
  communityVolunteer : "https://www.seek.co.nz/jobs-in-community-services-development/volunteer-coordination-support",
  communityOther : "https://www.seek.co.nz/jobs-in-community-services-development/other",
  communityAge : "https://www.seek.co.nz/jobs-in-community-services-development/aged-disability-support",
  communityChild : "http://seek.co.nz/jobs-in-community-services-development/child-welfare-youth-family-services",
  communityDevelopment : "https://www.seek.co.nz/jobs-in-community-services-development/community-development",
  communityServices : "https://www.seek.co.nz/jobs-in-community-services-development/employment-services",
  communityFund : "https://www.seek.co.nz/jobs-in-community-services-development/fundraising",
  communityHousing : "https://www.seek.co.nz/jobs-in-community-services-development/housing-homelessness-services",
  communityCulture : "https://www.seek.co.nz/jobs-in-community-services-development/indigenous-multicultural-services",
  communityManagement : "https://www.seek.co.nz/jobs-in-community-services-development/management",
  communityVolunteer : "https://www.seek.co.nz/jobs-in-community-services-development/volunteer-coordination-support",
  communityOther : "https://www.seek.co.nz/jobs-in-community-services-development/other",
  constructionContracts : "https://www.seek.co.nz/jobs-in-construction/contracts-management",
  constructionEstimating : "https://www.seek.co.nz/jobs-in-construction/estimating",
  constructionSuper : "https://www.seek.co.nz/jobs-in-construction/foreperson-supervisors",
  constructionHealth : "https://www.seek.co.nz/jobs-in-construction/health-safety-environment",
  constructionManagement : "https://www.seek.co.nz/jobs-in-construction/management",
  constructionPlanning : "https://www.seek.co.nz/jobs-in-construction/planning-scheduling",
  constructionPlant : "https://www.seek.co.nz/jobs-in-construction/plant-machinery-operators",
  constructionProject : "https://www.seek.co.nz/jobs-in-construction/project-management",
  constructionQuality : "https://www.seek.co.nz/jobs-in-construction/quality-assurance-control",
  constructionSurvey : "https://www.seek.co.nz/jobs-in-construction/surveying",
  constructionOther : "https://www.seek.co.nz/jobs-in-construction/other",
  engineeringAerospace : "https://www.seek.co.nz/jobs-in-engineering/aerospace-engineering",
  engineeringAuto : "https://www.seek.co.nz/jobs-in-engineering/automotive-engineering",
  engineeringBuilding : "https://www.seek.co.nz/jobs-in-engineering/building-services-engineering",
  engineeringChemical : "https://www.seek.co.nz/jobs-in-engineering/chemical-engineering",
  engineeringCivil : "https://www.seek.co.nz/jobs-in-engineering/civil-structural-engineering",
  engineeringElectrical : "https://www.seek.co.nz/jobs-in-engineering/electrical-electronic-engineering",
  engineeringEngi : "https://www.seek.co.nz/jobs-in-engineering/engineering-drafting",
  engineeringEnvironment : "https://www.seek.co.nz/jobs-in-engineering/environmental-engineering",
  engineeringField : "https://www.seek.co.nz/jobs-in-engineering/field-engineering",
  engineeringIndustrial : "https://www.seek.co.nz/jobs-in-engineering/industrial-engineering",
  engineeringMaintenance : "https://www.seek.co.nz/jobs-in-engineering/maintenance",
  engineeringManagement : "https://www.seek.co.nz/jobs-in-engineering/management",
  engineeringManagement : "https://www.seek.co.nz/jobs-in-engineering/materials-handling-engineering",
  engineeringMechanical : "https://www.seek.co.nz/jobs-in-engineering/mechanical-engineering",
  engineeringProcess : "https://www.seek.co.nz/jobs-in-engineering/process-engineering",
  engineeringProject : "https://www.seek.co.nz/jobs-in-engineering/project-engineering",
  engineeringPm : "https://www.seek.co.nz/jobs-in-engineering/project-management",
  engineeringSupervisors : "https://www.seek.co.nz/jobs-in-engineering/supervisors",
  engineeringSystems : "https://www.seek.co.nz/jobs-in-engineering/systems-engineering",
  engineeringWaste : "https://www.seek.co.nz/jobs-in-engineering/water-waste-engineering",
  engineeringOther : "https://www.seek.co.nz/jobs-in-engineering/other",
  governmentAir : "https://www.seek.co.nz/jobs-in-government-defence/air-force",
  governmentArmy : "https://www.seek.co.nz/jobs-in-government-defence/army",
  governmentEmergency : "https://www.seek.co.nz/jobs-in-government-defence/emergency-services",
  governmentGov : "https://www.seek.co.nz/jobs-in-government-defence/government",
  governmentLocal : "https://www.seek.co.nz/jobs-in-government-defence/local-government",
  governmentNavy : "https://www.seek.co.nz/jobs-in-government-defence/navy",
  governmentPolice : "https://www.seek.co.nz/jobs-in-government-defence/police-corrections",
  governmentPolicy : "https://www.seek.co.nz/jobs-in-government-defence/policy-planning-regulation",
  governmentRegional : "https://www.seek.co.nz/jobs-in-government-defence/regional-council",
  governmentOther : "https://www.seek.co.nz/jobs-in-government-defence/other",
  hospoAir : "https://www.seek.co.nz/jobs-in-hospitality-tourism/airlines",
  hospoBar : "https://www.seek.co.nz/jobs-in-hospitality-tourism/bar-beverage-staff",
  hospoChef : "https://www.seek.co.nz/jobs-in-hospitality-tourism/chefs-cooks",
  hospoFront : "https://www.seek.co.nz/jobs-in-hospitality-tourism/front-office-guest-services",
  hospoGaming : "https://www.seek.co.nz/jobs-in-hospitality-tourism/gaming",
  hospoHouse : "https://www.seek.co.nz/jobs-in-hospitality-tourism/housekeeping",
  hospoKitchen : "https://www.seek.co.nz/jobs-in-hospitality-tourism/kitchen-sandwich-hands",
  hospoManagement : "https://www.seek.co.nz/jobs-in-hospitality-tourism/management",
  hospoReserv : "https://www.seek.co.nz/jobs-in-hospitality-tourism/reservations",
  hospoTour : "https://www.seek.co.nz/jobs-in-hospitality-tourism/tour-guides",
  hospoTravel : "https://www.seek.co.nz/jobs-in-hospitality-tourism/travel-agents-consultants",
  hospoWaiting : "https://www.seek.co.nz/jobs-in-hospitality-tourism/waiting-staff",
  hospoOther : "https://www.seek.co.nz/jobs-in-hospitality-tourism/other",
  health1 : "https://www.seek.co.nz/jobs-in-healthcare-medical/ambulance-paramedics",
  health2 : "https://www.seek.co.nz/jobs-in-healthcare-medical/chiropractic-osteopathic",
  health3 : "https://www.seek.co.nz/jobs-in-healthcare-medical/clinical-medical-research",
  health4 : "https://www.seek.co.nz/jobs-in-healthcare-medical/dental",
  health5 : "https://www.seek.co.nz/jobs-in-healthcare-medical/dieticians",
  health6 : "https://www.seek.co.nz/jobs-in-healthcare-medical/environmental-services",
  health7 : "https://www.seek.co.nz/jobs-in-healthcare-medical/general-practitioners",
  health8 : "https://www.seek.co.nz/jobs-in-healthcare-medical/management",
  health9 : "https://www.seek.co.nz/jobs-in-healthcare-medical/medical-administration",
  health10 : "https://www.seek.co.nz/jobs-in-healthcare-medical/medical-imaging",
  health11 : "https://www.seek.co.nz/jobs-in-healthcare-medical/medical-specialists",
  health12 : "https://www.seek.co.nz/jobs-in-healthcare-medical/natural-therapies-alternative-medicine",
  health13 : "https://www.seek.co.nz/jobs-in-healthcare-medical/nursing-a-e-critical-care-icu",
  health14 : "https://www.seek.co.nz/jobs-in-healthcare-medical/nursing-aged-care",
  health15 : "https://www.seek.co.nz/jobs-in-healthcare-medical/nursing-community-maternal-child-health",
  health16 : "https://www.seek.co.nz/jobs-in-healthcare-medical/nursing-educators-facilitators",
  health17 : "https://www.seek.co.nz/jobs-in-healthcare-medical/nursing-general-medical-surgical",
  health18 : "https://www.seek.co.nz/jobs-in-healthcare-medical/nursing-high-acuity",
  health19 : "https://www.seek.co.nz/jobs-in-healthcare-medical/nursing-management",
  health20 : "https://www.seek.co.nz/jobs-in-healthcare-medical/nursing-midwifery-neo-natal-scn-nicu",
  health21 : "https://www.seek.co.nz/jobs-in-healthcare-medical/nursing-paediatric-picu",
  health22 : "https://www.seek.co.nz/jobs-in-healthcare-medical/nursing-psych-forensic-correctional-health",
  health23 : "https://www.seek.co.nz/jobs-in-healthcare-medical/nursing-theatre-recovery",
  health24 : "https://www.seek.co.nz/jobs-in-healthcare-medical/optical",
  health25 : "https://www.seek.co.nz/jobs-in-healthcare-medical/pathology",
  health26 : "https://www.seek.co.nz/jobs-in-healthcare-medical/pharmaceuticals-medical-devices",
  health27 : "https://www.seek.co.nz/jobs-in-healthcare-medical/pharmacy",
  health28 : "https://www.seek.co.nz/jobs-in-healthcare-medical/physiotherapy-ot-rehabilitation",
  health29 : "https://www.seek.co.nz/jobs-in-healthcare-medical/psychology-counselling-social-work",
  health30 : "https://www.seek.co.nz/jobs-in-healthcare-medical/residents-registrars",
  health31 : "https://www.seek.co.nz/jobs-in-healthcare-medical/sales",
  health32 : "https://www.seek.co.nz/jobs-in-healthcare-medical/speech-therapy",
  health33 : "https://www.seek.co.nz/jobs-in-healthcare-medical/other",
  tech1 : "https://www.seek.co.nz/jobs-in-information-communication-technology/architects",
  tech2 : "https://www.seek.co.nz/jobs-in-information-communication-technology/business-systems-analysts",
  tech3 : "https://www.seek.co.nz/jobs-in-information-communication-technology/computer-operators",
  tech4: "https://www.seek.co.nz/jobs-in-information-communication-technology/consultants",
  tech5 : "https://www.seek.co.nz/jobs-in-information-communication-technology/database-development-administration",
  tech6 : "https://www.seek.co.nz/jobs-in-information-communication-technology/developers-programmers",
  tech7 : "https://www.seek.co.nz/jobs-in-information-communication-technology/engineering-hardware",
  tech8 : "https://www.seek.co.nz/jobs-in-information-communication-technology/engineering-network",
  tech9 : "https://www.seek.co.nz/jobs-in-information-communication-technology/engineering-software",
  tech10 : "https://www.seek.co.nz/jobs-in-information-communication-technology/help-desk-it-support",
  tech11 : "https://www.seek.co.nz/jobs-in-information-communication-technology/management",
  tech12 : "https://www.seek.co.nz/jobs-in-information-communication-technology/networks-systems-administration",
  tech13 : "https://www.seek.co.nz/jobs-in-information-communication-technology/product-management-development",
  tech14 : "https://www.seek.co.nz/jobs-in-information-communication-technology/programme-project-management",
  tech15 : "https://www.seek.co.nz/jobs-in-information-communication-technology/sales-pre-post",
  tech16 : "https://www.seek.co.nz/jobs-in-information-communication-technology/security",
  tech17 : "https://www.seek.co.nz/jobs-in-information-communication-technology/team-leaders",
  tech18 : "https://www.seek.co.nz/jobs-in-information-communication-technology/technical-writing",
  tech19 : "https://www.seek.co.nz/jobs-in-information-communication-technology/telecommunications",
  tech20 : "https://www.seek.co.nz/jobs-in-information-communication-technology/testing-quality-assurance",
  tech21 : "https://www.seek.co.nz/jobs-in-information-communication-technology/web-development-production",
  tech22 : "https://www.seek.co.nz/jobs-in-information-communication-technology/other",
  manufacturing1 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/analysis-reporting",
  manufacturing2 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/assembly-process-work",
  manufacturing3 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/aviation-services",
  manufacturing4 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/couriers-drivers-postal-services",
  manufacturing5 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/fleet-management",
  manufacturing6 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/freight-cargo-forwarding",
  manufacturing7 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/import-export-customs",
  manufacturing8 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/machine-operators",
  manufacturing9 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/management",
  manufacturing10 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/pattern-makers-garment-technicians",
  manufacturing11 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/pickers-packers",
  manufacturing12 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/production-planning-scheduling",
  manufacturing13 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/public-transport-taxi-services",
  manufacturing14 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/purchasing-procurement-inventory",
  manufacturing15 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/quality-assurance-control",
  manufacturing16 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/rail-maritime-transport",
  manufacturing17 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/road-transport",
  manufacturing18 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/team-leaders-supervisors",
  manufacturing19 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/warehousing-storage-distribution",
  manufacturing20 : "https://www.seek.co.nz/jobs-in-manufacturing-transport-logistics/other",
  salesAccount : "https://www.seek.co.nz/jobs-in-sales/account-relationship-management",
  salesBiz : "https://www.seek.co.nz/jobs-in-sales/new-business-development",
  sales3 : "https://www.seek.co.nz/jobs-in-sales/sales-coordinators",
  sales4 : "https://www.seek.co.nz/jobs-in-sales/sales-representatives-consultants",
  sales5 : "https://www.seek.co.nz/jobs-in-sales/other",
  retail1 : "https://www.seek.co.nz/jobs-in-retail-consumer-products/management-department-assistant",
  retail1 : "https://www.seek.co.nz/jobs-in-retail-consumer-products/management-store",
  retail1 : "https://www.seek.co.nz/jobs-in-retail-consumer-products/merchandisers",
  retail1 : "https://www.seek.co.nz/jobs-in-retail-consumer-products/retail-assistants",
  trade11 : "https://www.seek.co.nz/jobs-in-trades-services/air-conditioning-refrigeration",
  trade12 : "https://www.seek.co.nz/jobs-in-trades-services/automotive-trades",
  trade13 : "https://www.seek.co.nz/jobs-in-trades-services/bakers-pastry-chefs",
  trade14 : "https://www.seek.co.nz/jobs-in-trades-services/building-trades",
  trade15 : "https://www.seek.co.nz/jobs-in-trades-services/butchers",
  trade16 : "https://www.seek.co.nz/jobs-in-trades-services/carpentry-cabinet-making",
  trade17 : "https://www.seek.co.nz/jobs-in-trades-services/cleaning-services",
  trade18 : "https://www.seek.co.nz/jobs-in-trades-services/electricians",
  trade19 : "https://www.seek.co.nz/jobs-in-trades-services/fitters-turners-machinists",
  trade20 : "https://www.seek.co.nz/jobs-in-trades-services/floristry",
  trade21 : "https://www.seek.co.nz/jobs-in-trades-services/gardening-landscaping",
  trade22 : "https://www.seek.co.nz/jobs-in-trades-services/hair-beauty-services",
  trade23 : "https://www.seek.co.nz/jobs-in-trades-services/labourers",
  trade24 : "https://www.seek.co.nz/jobs-in-trades-services/locksmiths",
  trade25 : "https://www.seek.co.nz/jobs-in-trades-services/maintenance-handyperson-services",
  trade26 : "https://www.seek.co.nz/jobs-in-trades-services/nannies-babysitters",
  trade27 : "https://www.seek.co.nz/jobs-in-trades-services/painters-sign-writers",
  trade28 : "https://www.seek.co.nz/jobs-in-trades-services/plumbers",
  trade29 : "https://www.seek.co.nz/jobs-in-trades-services/security-services",
  trade30 : "https://www.seek.co.nz/jobs-in-trades-services/technicians",
 
 
 
 };

 function constructUrl(baseURL, page) {
  return `${baseURL}?page=${page}`;
}


// Helper: read jobs from CSV
// 1) Read CSV into an array of job objects
async function readJobsFromCSV(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.log(`CSV file not found: ${filePath}`);
      resolve([]);
      return;
    }
    const jobs = [];
    fs.createReadStream(filePath)
      .pipe(fastcsv.parse({ headers: true }))
      .on("data", (row) => jobs.push(row))
      .on("end", () => {
        console.log(`Read ${jobs.length} jobs from CSV`);
        resolve(jobs);
      })
      .on("error", (error) => {
        console.error(`Error reading CSV file: ${error}`);
        reject(error);
      });
  });
}

/* ===========================
   Stage One: Scrape Job Listings
   (Unchanged from your code)
   =========================== */

async function scrapeJobPage(url) {
  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let browser;
    try {
      browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      page.setDefaultTimeout(90000);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });

      const todayDate = new Date().toISOString().split('T')[0];
      const jobs = await page.evaluate((todayDate) => {
        function formatDate(string) {
          const match = string.match(/^(\d+)d$/);
          if (!match) return null;
          const daysAgo = parseInt(match[1], 10);
          if (isNaN(daysAgo)) return null;
          const date = new Date();
          date.setDate(date.getDate() - daysAgo);
          return date.toISOString();
        }

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
        if (locationElements.length >= 2) {
          locationCity = locationElements[0].innerText;
          locationRegion = locationElements[1].innerText;
        } else if (locationElements.length === 1) {
          locationCity = locationElements[0].innerText;
        }

        const jobsArr = [];
        for (let i = 0; i < titleElems.length; i++) {
          let locationCity = '';
          let locationRegion = '';
          if (locationElements.length >= 2) {
            locationCity = locationElements[0].innerText;
            locationRegion = locationElements[1].innerText;
          } else if (locationElements.length === 1) {
            locationCity = locationElements[0].innerText;
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
            email: "",
            phone: "",
            applyButton: "",
            city: locationCity,
            region: locationRegion,
            salary: salary,
            runDate: todayDate,
            fullDescription: "",
            jobClassification: "",
            comms: "",
            // You might also add "applied" here if you like:
            applied: ""
          };

          // Attempt to find an email or phone in any <p> tag
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

      console.log(`Scraped jobs from page: ${url}`);
      return jobs;
    } catch (error) {
      console.error(`Error scraping page ${url} on attempt ${attempt}: ${error.message}`);
      if (attempt < maxRetries) {
        console.log("Waiting 5 minutes before retrying...");
        await new Promise(res => setTimeout(res, 300000)); // 5 minutes
      } else {
        console.error(`Failed scraping page ${url} after ${maxRetries} attempts. Skipping this page.`);
        return null;
      }
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  return null;
}

async function scrapeAllJobs(subcatKey) {
  let currentPage = 1;
  let allJobs = [];
  let hasMorePages = true;
  const baseURL = baseUrls[subcatKey];

  console.log(`Scraping jobs from ${baseURL}`);
  while (hasMorePages) {
    const pageURL = constructUrl(baseURL, currentPage);
    console.log(`Scraping page: ${pageURL}`);
    
    const jobsOnPage = await scrapeJobPage(pageURL);
    if (jobsOnPage === null) {
      // Skip this page and continue
      currentPage++;
      continue;
    }
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
      .on("data", (row) => jobs.push(row))
      .on("end", () => {
        console.log(`Read ${jobs.length} existing jobs from CSV`);
        resolve(jobs);
      })
      .on("error", (error) => {
        console.error(`Error reading CSV file: ${error}`);
        reject(error);
      });
  });
}

async function saveJobsToCSV(jobsToAdd, filePath) {
  const existingJobs = await readExistingJobsFromCSV(filePath);
  const existingJobsArray = Array.isArray(existingJobs) ? existingJobs : [];
  const jobsToAppend = jobsToAdd.filter(newJob =>
    !existingJobsArray.some(existingJob =>
      existingJob.title === newJob.title && existingJob.company === newJob.company
    )
  );
  console.log(`New jobs to append: ${jobsToAppend.length}`);
  if (jobsToAppend.length > 0) {
    const ws = fs.createWriteStream(filePath, { flags: 'a', includeEndRowDelimiter: true });
    fastcsv.write(jobsToAppend, { headers: false, includeEndRowDelimiter: true }).pipe(ws);
  }
}

/* ===========================
   Stage Two: Update with Live Contact Info
   =========================== */

function extractContactInfoFromHTML(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const bodyText = document.body.textContent;
  const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/;
  const phoneRegex = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/;
  const emailMatch = bodyText.match(emailRegex);
  const phoneMatch = bodyText.match(phoneRegex);

  const applyButtonElem = document.querySelector('a[data-automation="job-detail-apply"]');
  const applyButtonText = applyButtonElem ? applyButtonElem.textContent.trim() : "";

  const descriptionElem = document.querySelector('div[data-automation="jobAdDetails"]');
  const fullDescription = descriptionElem ? descriptionElem.textContent.replace(/\n/g, ' ') : "";

  const classificationElem = document.querySelector('span[data-automation="job-detail-classifications"]');
  const jobClassification = classificationElem ? classificationElem.textContent : "";

  return {
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null,
    fullDescription,
    jobClassification,
    applyButtonText
  };
}

async function scrapeEmailFromJobPage(jobUrl) {
  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let browser;
    try {
      browser = await puppeteer.launch({ headless: true, timeout: 90000 });
      const page = await browser.newPage();
      console.log(`Scraping live contact info from ${jobUrl} (attempt ${attempt})`);
      await page.goto(jobUrl, { waitUntil: "networkidle0", timeout: 90000 });

      const contactInfo = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/;
        const phoneRegex = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/;
        const emailMatch = bodyText.match(emailRegex);
        const phoneMatch = bodyText.match(phoneRegex);

        const applyButtonElem = document.querySelector('a[data-automation="job-detail-apply"]');
        const applyButtonText = applyButtonElem ? applyButtonElem.innerText.trim() : "";

        const descriptionElem = document.querySelector('div[data-automation="jobAdDetails"]');
        const fullDescription = descriptionElem ? descriptionElem.innerText.replace(/\n/g, ' ') : "";

        const classificationElem = document.querySelector('span[data-automation="job-detail-classifications"]');
        const jobClassification = classificationElem ? classificationElem.innerText : "";

        return {
          email: emailMatch ? emailMatch[0] : null,
          phone: phoneMatch ? phoneMatch[0] : null,
          fullDescription,
          jobClassification,
          applyButtonText
        };
      });

      return contactInfo;
    } catch (error) {
      console.error(`Error scraping live contact info for ${jobUrl} on attempt ${attempt}: ${error.message}`);
      if (attempt < maxRetries) {
        console.log("Waiting 5 minutes before retrying this job...");
        await new Promise(res => setTimeout(res, 300000)); // 5 minutes
      } else {
        console.error(`Failed scraping live contact info for ${jobUrl} after ${maxRetries} attempts. Skipping this link.`);
        return null;
      }
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  return null;
}

async function updateCSV(filePath, jobs) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(filePath, { flags: 'w' });
    fastcsv.write(jobs, { headers: true }).pipe(ws)
      .on("finish", () => resolve())
      .on("error", (err) => reject(err));
  });
}
/* ===========================
   Main: Run Stage One then Stage Two
   =========================== */
(async () => {
  const csvFilePath = path.join(__dirname, "jobListings.csv");
  const updatedCsvFilePath = path.join(__dirname, "jobListings_withContact.csv");

  // ---------- STAGE ONE (Commented Out if You Already Have a CSV) ----------
  // let allScrapedJobs = [];
  // for (const subcatKey of Object.keys(baseUrls)) {
  //   console.log(`\nProcessing subcategory: ${subcatKey} with URL: ${baseUrls[subcatKey]}`);
  //   const scrapedJobs = await scrapeAllJobs(subcatKey);
  //   console.log(`Scraped ${scrapedJobs.length} jobs for ${subcatKey}`);
  //   allScrapedJobs = allScrapedJobs.concat(scrapedJobs);
  // }
  // await saveJobsToCSV(allScrapedJobs, csvFilePath);
  // console.log("Job listings scraping completed and saved to CSV.");

  // ---------- STAGE TWO ----------
 // ---------- STAGE TWO: Update with Live Contact Info ----------
let jobs = await readJobsFromCSV(csvFilePath);

// Process only the first 10 jobs with an empty "applied" field
let count = 0;
for (let i = 0; i < jobs.length; i++) {
  const job = jobs[i];
  
  // Check if the job has a valid link and the "applied" field is empty
  if (job.link && (!job.applied || job.applied.trim() === "")) {
    const contactDetails = await scrapeEmailFromJobPage(job.link);
    if (contactDetails) {
      job.email = contactDetails.email || job.email;
      job.phone = contactDetails.phone || job.phone;
      job.fullDescription = contactDetails.fullDescription || job.fullDescription;
      job.jobClassification = contactDetails.jobClassification || job.jobClassification;
      job.applyButton = contactDetails.applyButtonText || job.applyButton;
      // Mark "applied" as today's date so that this job won't be processed again
      job.applied = new Date().toISOString().split('T')[0];
      console.log(`Updated job: ${job.title} | ${job.company}`);
    }
    count++;
    // Stop after processing 10 jobs
    // if (count >= 10) break;

    // Throttle requests
    await new Promise(res => setTimeout(res, 2000));
  }
}

await updateCSV(updatedCsvFilePath, jobs);
console.log("Updated job listings with live contact info saved to CSV.");
})();