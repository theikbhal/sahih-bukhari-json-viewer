const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

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
    
    // Extract reference like: "Sahih al-Bukhari 8, Book 1, Hadith 8"
    let hadithNumber = null;
    let bookNumber = null;
    let referenceText = "";

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

async function scrapeAllHadiths(start = 1, end = 1000) {
  const results = [];

  for (let i = start; i <= end; i++) {
    const hadith = await scrapeHadithById(i);
    if (hadith) results.push(hadith);

    // ⏱ Wait for 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const filePath = `bukhari_1_to_${end}.json`;
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`✅ Scraped ${results.length} hadiths. Saved to ${filePath}`);
}

// Start scraping
scrapeAllHadiths(1, 1000);
