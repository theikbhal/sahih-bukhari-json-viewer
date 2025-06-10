const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Path to the merged Hadith JSON file
const ALL_HADITHS_FILE = path.join(__dirname, 'json', 'all_hadiths.json');

let allHadiths = [];
let hadithsByNumber = {}; // Map hadithGlobalNumber to Hadith object
let hadithsByBook = {};   // Map bookNumber to an object of hadithsByNumberInBook

async function loadHadithData() {
    try {
        if (!fs.existsSync(ALL_HADITHS_FILE)) {
            console.error(`Error: Merged Hadith file not found at ${ALL_HADITHS_FILE}`);
            console.error("Please run 'node merge_hadiths.js' first.");
            return;
        }

        const data = fs.readFileSync(ALL_HADITHS_FILE, 'utf8');
        allHadiths = JSON.parse(data);
        console.log(`Loaded ${allHadiths.length} Hadiths from ${ALL_HADITHS_FILE}`);

        // Populate lookup maps
        allHadiths.forEach(hadith => {
            if (hadith.globalId) {
                hadithsByNumber[hadith.globalId] = hadith;
            }

            if (hadith.bookNumber && hadith.numberInBook) {
                if (!hadithsByBook[hadith.bookNumber]) {
                    hadithsByBook[hadith.bookNumber] = {};
                }
                hadithsByBook[hadith.bookNumber][hadith.numberInBook] = hadith;
            }
        });

        console.log(`Indexed ${Object.keys(hadithsByNumber).length} Hadiths by global number.`);
        console.log(`Indexed ${Object.keys(hadithsByBook).length} Books.`);

    } catch (error) {
        console.error(`Failed to load or parse Hadith data: ${error.message}`);
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

// API endpoint for /hadith/:hadithNumber
app.get('/hadith/:hadithNumber', (req, res) => {
    const hadithNumber = parseInt(req.params.hadithNumber);
    if (isNaN(hadithNumber)) {
        return res.status(400).json({ error: 'Invalid Hadith number.' });
    }

    const hadith = hadithsByNumber[hadithNumber];
    if (hadith) {
        res.json(hadith);
    } else {
        res.status(404).json({ error: `Hadith number ${hadithNumber} not found.` });
    }
});

// API endpoint for /book/:bookNumber/hadith/:hadithNumber
app.get('/book/:bookNumber/hadith/:hadithNumber', (req, res) => {
    const bookNumber = parseInt(req.params.bookNumber);
    const hadithNumber = parseInt(req.params.hadithNumber);

    if (isNaN(bookNumber) || isNaN(hadithNumber)) {
        return res.status(400).json({ error: 'Invalid book or Hadith number.' });
    }

    const bookHadiths = hadithsByBook[bookNumber];
    if (bookHadiths) {
        const hadith = bookHadiths[hadithNumber];
        if (hadith) {
            res.json(hadith);
        } else {
            res.status(404).json({ error: `Hadith number ${hadithNumber} not found in Book ${bookNumber}.` });
        }
    } else {
        res.status(404).json({ error: `Book ${bookNumber} not found.` });
    }
});

// Root route to serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Try:');
    console.log(`  http://localhost:${PORT}/hadith/1`);
    console.log(`  http://localhost:${PORT}/book/1/hadith/1`);
}); 