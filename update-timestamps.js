const fs = require('fs');
const axios = require('axios');
const pdf = require('pdf-parse');

/**
 * Attempt to extract date strings from text using several regex patterns.
 * Returns the most recent date in ISO format, or null if none found.
 */
function extractDatesFromText(text) {
  const datePatterns = [
    // ISO format: 2025-04-01
    /\b\d{4}-\d{2}-\d{2}\b/g,
    // US/European numeric: 04/01/2025 or 4/1/2025 or 04-01-2025
    /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g,
    // Long month formats: "Jan 2, 2025" or "January 02, 2025"
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+\d{4}\b/gi,
    // European format with month names: "2 Jan 2025"
    /\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+\d{4}\b/gi
  ];
  let dates = [];
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const parsed = new Date(match);
        if (!isNaN(parsed)) {
          dates.push(parsed);
        }
      }
    }
  }
  if (dates.length === 0) return null;
  // Get the most recent date
  const mostRecent = dates.reduce((a, b) => (a > b ? a : b));
  return mostRecent.toISOString();
}

/**
 * Fetches the resource at the given URL, converts it to text,
 * and then extracts the most recent date found.
 */
async function fetchUpdateDate(url) {
  try {
    let modifiedUrl = url;
    // For Google Docs resources, modify URL to export as PDF.
    if (url.includes('docs.google.com')) {
      // Replace '/edit' and beyond with export parameters.
      modifiedUrl = url.replace(/\/edit.*$/, '/export?format=pdf');
    }
    // For other resources (e.g. Pastebin, Notion), we assume HTML.
    const response = await axios.get(modifiedUrl, { responseType: 'arraybuffer' });
    let content = '';
    const contentType = response.headers['content-type'] || '';

    if (contentType.includes('application/pdf')) {
      // Parse PDF content.
      const data = await pdf(response.data);
      content = data.text;
    } else if (contentType.includes('text/html')) {
      // Convert HTML to text by stripping tags.
      content = response.data.toString();
      content = content.replace(/<[^>]*>/g, ' ');
    } else {
      // For plain text or other types.
      content = response.data.toString();
    }
    const updateDate = extractDatesFromText(content);
    return updateDate;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

/**
 * Recursively processes the JSON structure.
 * For each object with a "link", fetches the resource, extracts dates,
 * and sets the most recent date as both created and updated.
 */
async function processObject(obj) {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      await processObject(item);
    }
  } else if (obj && typeof obj === 'object') {
    if (obj.link) {
      const updateDate = await fetchUpdateDate(obj.link);
      obj.updated = updateDate;
      // Here you could differentiate created from updated if desired.
      obj.created = updateDate;
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        await processObject(obj[key]);
      }
    }
  }
}

async function main() {
  try {
    const routesData = JSON.parse(fs.readFileSync('routes.json', 'utf8'));
    await processObject(routesData);
    fs.writeFileSync('routes-with-timestamps.json', JSON.stringify(routesData, null, 2));
    console.log('Created routes-with-timestamps.json successfully.');
  } catch (error) {
    console.error('Error processing routes:', error);
    process.exit(1);
  }
}

main();
