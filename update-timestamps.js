const fs = require('fs');
const axios = require('axios');

// Function to fetch timestamps via a HEAD request
async function fetchTimestamps(url) {
  try {
    const response = await axios.head(url);
    const lastModified = response.headers['last-modified'] || null;
    // Since creation date is not generally provided, we use lastModified for both.
    return { created: lastModified, updated: lastModified };
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return { created: null, updated: null };
  }
}

// Recursively process the JSON structure to add timestamps for each link.
async function processObject(obj) {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      await processObject(item);
    }
  } else if (obj && typeof obj === 'object') {
    // If the object has a link, fetch its timestamps
    if (obj.link) {
      const timestamps = await fetchTimestamps(obj.link);
      obj.created = timestamps.created;
      obj.updated = timestamps.updated;
    }
    // Process all properties recursively
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        await processObject(obj[key]);
      }
    }
  }
}

async function main() {
  try {
    // Read the existing routes.json
    const routesData = JSON.parse(fs.readFileSync('routes.json', 'utf8'));
    await processObject(routesData);
    // Write the new JSON with timestamp info
    fs.writeFileSync('routes-with-timestamps.json', JSON.stringify(routesData, null, 2));
    console.log('Created routes-with-timestamps.json successfully.');
  } catch (error) {
    console.error('Error processing routes:', error);
    process.exit(1);
  }
}

main();

