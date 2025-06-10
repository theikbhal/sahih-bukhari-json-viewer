const fs = require('fs');
const path = require('path');

const JSON_INPUT_DIR = path.join(__dirname, 'json');
const OUTPUT_FILE = path.join(JSON_INPUT_DIR, 'all_hadiths.json');

async function mergeHadithJsons() {
    console.log('Starting JSON merge process...');
    let allHadiths = [];
    let globalIndex = 0;

    try {
        const files = fs.readdirSync(JSON_INPUT_DIR);

        const hadithJsonFiles = files.filter(file => 
            file.startsWith('bukhari_') && file.endsWith('.json')
        ).sort((a, b) => {
            const getNumber = (filename) => {
                const match = filename.match(/bukhari_(\d+)/);
                return match ? parseInt(match[1]) : 0;
            };
            return getNumber(a) - getNumber(b);
        });

        if (hadithJsonFiles.length === 0) {
            console.warn(`No JSON files starting with "bukhari_" found in ${JSON_INPUT_DIR}`);
            return;
        }

        console.log(`Found ${hadithJsonFiles.length} Hadith JSON files to merge.`);

        // Loop through each file to merge its Hadiths
        for (const file of hadithJsonFiles) {
            const filePath = path.join(JSON_INPUT_DIR, file);
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                console.log(`Processing file: ${file} (contains ${data.length} hadiths)`);

                data.forEach((hadith) => {
                    // Use existing bookNumber and hadithNumber, add globalId
                    const processedHadith = {
                        globalId: ++globalIndex, // Assign a unique global ID
                        bookNumber: hadith.bookNumber, // Use existing bookNumber from JSON
                        numberInBook: hadith.hadithNumber, // Use existing hadithNumber from JSON
                        text: hadith.text || hadith.english || hadith.arabic || 'No text available',
                        ...hadith // Keep all other original properties
                    };
                    allHadiths.push(processedHadith);
                });
                console.log(`Total Hadiths merged so far: ${allHadiths.length}`);
            } catch (parseError) {
                console.error(`Error parsing file ${file}: ${parseError.message}`);
            }
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allHadiths, null, 2), 'utf8');
        console.log(`Successfully merged ${allHadiths.length} Hadiths into ${OUTPUT_FILE}`);

    } catch (error) {
        console.error(`An error occurred during the merge process: ${error.message}`);
    }
}

mergeHadithJsons(); 