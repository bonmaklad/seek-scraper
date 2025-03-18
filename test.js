const fs = require("fs");

// Suppose you have your classification JSON saved to a file
// (the file contains the array you showed)
const classificationData = JSON.parse(fs.readFileSync("classificationSubcategories.json", "utf8"));

const baseUrls = {};

// Loop over each main category object and then each subcategory
classificationData.forEach(categoryObj => {
  categoryObj.subcategories.forEach(subcat => {
    // Create a normalized key:
    //   - Lowercase all letters
    //   - Replace any sequence of non-alphanumeric characters with an underscore
    //   - Trim any leading/trailing underscores
    const key = subcat.text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    baseUrls[key] = subcat.href;
  });
});

// Print the object as a constant assignment (or save it to a file)
console.log("const baseUrls = " + JSON.stringify(baseUrls, null, 2) + ";");

// Optionally, save to a file
fs.writeFileSync("baseUrls.json", JSON.stringify(baseUrls, null, 2));
