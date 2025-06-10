const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Path to the merged JSON file
const ALL_HADITHS_FILE = path.join(__dirname, 'json', 'all_hadiths.json');

let allHadiths = []; // Array to store all Hadiths globally
let hadithsByBook = new Map(); // Map to store Hadiths grouped by book number

// Function to load all Hadith data from the merged file
function loadHadithData() {
    console.log('Loading Hadith data from merged file...');
    if (!fs.existsSync(ALL_HADITHS_FILE)) {
        console.error(`Error: Merged Hadith file not found at ${ALL_HADITHS_FILE}. Please run merge_hadiths.js first.`);
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(ALL_HADITHS_FILE, 'utf8'));
        allHadiths = data;

        // Re-populate hadithsByBook map for the second API endpoint
        hadithsByBook = new Map(); // Clear previous data
        allHadiths.forEach(hadith => {
            if (hadith.bookNumber) {
                if (!hadithsByBook.has(hadith.bookNumber)) {
                    hadithsByBook.set(hadith.bookNumber, []);
                }
                hadithsByBook.get(hadith.bookNumber).push(hadith);
            }
        });

        console.log(`Loaded ${allHadiths.length} Hadiths from ${ALL_HADITHS_FILE}`);
    } catch (parseError) {
        console.error(`Error parsing merged JSON file ${ALL_HADITHS_FILE}: ${parseError.message}`);
    }
}

// Load data when the server starts
loadHadithData();

// Enable CORS for all routes (for simple browser-based access)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins for simplicity
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// API 1: Get Hadith by Global Hadith Number
app.get('/hadith/:hadithNumber', (req, res) => {
    const requestedGlobalNumber = parseInt(req.params.hadithNumber);

    if (isNaN(requestedGlobalNumber) || requestedGlobalNumber <= 0) {
        return res.status(400).json({ error: 'Invalid Hadith number. Must be a positive integer.' });
    }

    // Find the Hadith using the globalId
    const hadith = allHadiths.find(h => h.globalId === requestedGlobalNumber);

    if (hadith) {
        res.json(hadith);
    } else {
        res.status(404).json({ error: `Hadith with global number ${requestedGlobalNumber} not found.` });
    }
});

// API 2: Get Hadith by Book Number and Hadith Number within that book
app.get('/book/:bookNumber/hadith/:hadithNumber', (req, res) => {
    const requestedBookNumber = parseInt(req.params.bookNumber);
    const requestedNumberInBook = parseInt(req.params.hadithNumber);

    if (isNaN(requestedBookNumber) || requestedBookNumber <= 0) {
        return res.status(400).json({ error: 'Invalid book number. Must be a positive integer.' });
    }
    if (isNaN(requestedNumberInBook) || requestedNumberInBook <= 0) {
        return res.status(400).json({ error: 'Invalid Hadith number. Must be a positive integer.' });
    }

    const bookHadiths = hadithsByBook.get(requestedBookNumber);

    if (!bookHadiths) {
        return res.status(404).json({ error: `Book ${requestedBookNumber} not found.` });
    }

    // Find the Hadith within this specific book's array by its original 'numberInBook' property
    const hadith = bookHadiths.find(h => h.numberInBook === requestedNumberInBook);

    if (hadith) {
        res.json(hadith);
    } else {
        res.status(404).json({ error: `Hadith number ${requestedNumberInBook} not found in Book ${requestedBookNumber}.` });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Hadith API is running on http://localhost:${PORT}`);
    console.log('Try:');
    console.log(`  http://localhost:${PORT}/hadith/1`);
    console.log(`  http://localhost:${PORT}/book/1/hadith/1`);
}); 