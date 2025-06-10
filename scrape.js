const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const OUTPUT_BATCH = 100;
const OUTPUT_DIR = path.join(__dirname, 'json');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'progress.json');

// Create output folder if missing
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`📁 Created folder: ${OUTPUT_DIR}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
    return JSON.parse(data).lastHadith || 0;
  }
  return 0;
}

function saveProgress(id) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastHadith: id }, null, 2));
}

async function scrapeHadithById(id) {
  const url = `https://sunnah.com/bukhari:${id}`;
  console.log(`🔍 Fetching: ${url}`);

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const container = $('.actualHadithContainer');

    const engText = container.find('.text_details').first().text().trim();
    const arabicText = container.find('.arabic_hadith_full').text().trim();
    const narrator = container.find('.hadith_narrated').text().trim();

    let hadithNumber = null;
    let bookNumber = null;
    let referenceText = '';

    $('.hadith_reference').each((_, el) => {
      const txt = $(el).text().trim();
      if (txt.toLowerCase().includes('bukhari')) {
        referenceText = txt;
        const matchHadith = txt.match(/Hadith\s+(\d+)/i);
        const matchBook = txt.match(/Book\s+(\d+)/i);
        if (matchHadith) hadithNumber = parseInt(matchHadith[1]);
        if (matchBook) bookNumber = parseInt(matchBook[1]);
      }
    });

    return {
      hadithGlobalNumber: id,
      id,
      url,
      bookNumber,
      hadithNumber,
      narrator,
      english: engText,
      arabic: arabicText,
      reference: referenceText
    };
  } catch (err) {
    console.error(`❌ Failed to fetch ${url}: ${err.message}`);
    return null;
  }
}

async function scrapeAllHadiths(max = 1000) {
  let current = loadProgress() + 1;
  let batch = [];

  while (current <= max) {
    const hadith = await scrapeHadithById(current);
    if (hadith) batch.push(hadith);

    if (batch.length === OUTPUT_BATCH || current === max) {
      const start = batch[0]?.hadithGlobalNumber || current;
      const end = batch[batch.length - 1]?.hadithGlobalNumber || current;
      const fileName = path.join(OUTPUT_DIR, `bukhari_${start}_to_${end}.json`);
      fs.writeFileSync(fileName, JSON.stringify(batch, null, 2));
      console.log(`💾 Saved ${batch.length} hadiths to ${fileName}`);
      batch = [];
    }

    saveProgress(current);
    current++;
    await delay(100); // 0.1s
  }

  console.log('✅ Done scraping all hadiths.');
}

scrapeAllHadiths(1000);
