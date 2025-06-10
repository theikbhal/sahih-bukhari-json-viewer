const fs = require('fs');
const path = require('path');
const { generateHadithImages } = require('./generate_yt_short_image');

// Configuration
const JSON_FILE_PATH = path.join(__dirname, 'json', 'all_hadiths.json');
const OUTPUT_DIR = path.join(__dirname, 'videos');
const METADATA_FILE = path.join(__dirname, 'video_metadata.json');
const MAX_HADITHS = 10; // Start with 10 Hadiths as test

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Function to generate a concise title
function generateTitle(hadith) {
    // Get first 50 characters of the Hadith text
    const firstWords = hadith.text.split(' ').slice(0, 10).join(' ');
    return `Hadith ${hadith.globalId} | Book ${hadith.bookNumber}:${hadith.numberInBook} | ${firstWords}...`;
}

// Function to generate full description
function generateDescription(hadith) {
    return `📚 Hadith ${hadith.globalId} from Sahih al-Bukhari
Book ${hadith.bookNumber}, Hadith ${hadith.numberInBook}

${hadith.text}

Narrated by: ${hadith.narrator}
Reference: https://sunnah.com/bukhari/${hadith.globalId}`;
}

// Function to generate metadata for a single Hadith
async function generateMetadataForHadith(hadith) {
    const videoFileName = `hadith_${hadith.globalId}_shorts.mp4`;
    const localPath = path.join(OUTPUT_DIR, videoFileName);
    const phpPath = `/videos/${videoFileName}`; // Adjust this path based on your upload server structure
    const channelUrl = `https://youtube.com/@your-channel`; // Replace with your channel URL

    return {
        hadithId: hadith.globalId,
        bookNumber: hadith.bookNumber,
        numberInBook: hadith.numberInBook,
        title: generateTitle(hadith),
        description: generateDescription(hadith),
        localPath: localPath,
        phpPath: phpPath,
        channelUrl: channelUrl,
        status: 'pending', // pending, uploaded, failed
        createdAt: new Date().toISOString()
    };
}

// Main function to process Hadiths and generate metadata
async function generateMetadata() {
    try {
        // Read Hadith data
        const hadithsData = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf8'));
        console.log(`Loaded ${hadithsData.length} Hadiths from ${JSON_FILE_PATH}`);

        // Process first 10 Hadiths
        const metadata = [];
        for (let i = 0; i < Math.min(MAX_HADITHS, hadithsData.length); i++) {
            const hadith = hadithsData[i];
            console.log(`Processing Hadith ${hadith.globalId}...`);

            // Generate video first
            await generateHadithImages(hadith);

            // Generate metadata
            const videoMetadata = await generateMetadataForHadith(hadith);
            metadata.push(videoMetadata);
        }

        // Save metadata to JSON file
        fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
        console.log(`Metadata saved to ${METADATA_FILE}`);

        // Print summary
        console.log('\nGenerated metadata for videos:');
        metadata.forEach(m => {
            console.log(`\nHadith ${m.hadithId}:`);
            console.log(`Title: ${m.title}`);
            console.log(`Local Path: ${m.localPath}`);
            console.log(`Status: ${m.status}`);
        });

    } catch (error) {
        console.error('Error generating metadata:', error);
    }
}

// Run the script
generateMetadata(); 