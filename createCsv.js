const fs = require('fs');

function jsonToCSV(jsonData) {
    // Extract headers
    const headers = Object.keys(jsonData[0]);

    // Map the JSON objects to CSV rows
    const rows = jsonData.map(obj => 
        headers.map(fieldName => JSON.stringify(obj[fieldName], (key, value) => 
            typeof value === 'string' ? value.replace(/(\r\n|\n|\r)/gm, "") : value
        )).join(',')
    );

    // Combine headers and rows
    return headers.join(',') + '\n' + rows.join('\n');
}

// Usage example
const jsonData = require('./data/json/whanganui/react_whanganui_2023-11-26.json');
const csvData = jsonToCSV(jsonData);

// Write CSV to a file
fs.writeFile('output.csv', csvData, (err) => {
    if (err) throw err;
    console.log('CSV file has been saved.');
});