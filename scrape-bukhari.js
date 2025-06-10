const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrapeBook(bookNumber) {
  let page = 1;
  let hadiths = [];

  while (true) {
    const url = `https://sunnah.com/bukhari/${bookNumber}/${page}`;
    console.log(`🔍 Fetching: ${url}`);

    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const foundHadiths = $('.actualHadithContainer').map((i, el) => {
        const hadithId = $(el).attr('id') || null;
        const engText = $(el).find('.text_details').first().text().trim();
        const arabicText = $(el).find('.arabic_hadith_full').text().trim();
        const narrator = $(el).find('.hadith_narrated').text().trim();

        // 📌 Extract Hadith Number from reference (e.g., "Sahih al-Bukhari 76")
        let hadithNumber = null;
        let reference = '';
        $(el).find('.hadith_reference'_
