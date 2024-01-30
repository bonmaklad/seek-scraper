
const axios = require('axios');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Example job data
let jobData = {
    title: "Software Engineer",
    description: "We are looking for a skilled software engineer to join our team.",
    city: "Wellington",
    region: "Wellington",
    salary: "80000 per annum"
};

function prepareData(data) {
    const defaults = {
        title: "Job Title",
        description: "Job Description",
        city: "City",
        region: "Region",
        salary: "Salary"
    };

    Object.keys(defaults).forEach(key => {
        if (!data[key]) {
            data[key] = defaults[key];
        }
    });

    return data;
}

jobData = prepareData(jobData);

const prompt = `Given the job title "${jobData.title}", located in ${jobData.city}, ${jobData.region} with a salary of ${jobData.salary}, generate a comprehensive job description and other relevant job details.`;
 // Make sure to set your API key in environment variables

async function getJobDetailsFromOpenAI(prompt) {
    try {
        const response = await axios.post('https://api.openai.com/v1/engines/davinci/completions', {
            prompt: prompt,
            max_tokens: 150
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
        });

        return response.data.choices[0].text;
    } catch (error) {
        console.error('Error with OpenAI API:', error);
        throw error;
    }
}

(async () => {
    const enhancedJobDetails = await getJobDetailsFromOpenAI(prompt);
    
    // Example of formatting the response (this will vary based on the actual response structure)
    const formattedJobDetails = {
        title: jobData.title,
        description: enhancedJobDetails,
        // ... other fields ...
    };

    // Here, you would insert `formattedJobDetails` into your database
})();

