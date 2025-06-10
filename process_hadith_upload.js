const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const readline = require('readline');
const { generateHadithVideo } = require('./generate_hadith_video');

console.log('Type of generateHadithVideo:', typeof generateHadithVideo);

// Configuration
const JSON_FILE_PATH = path.join(__dirname, 'json', 'all_hadiths.json');
const VIDEO_OUTPUT_DIR = path.join(__dirname, 'videos');
const API_BASE_URL = 'http://tawhid.in/tiny/videos/1000videos';
const UPLOAD_API_URL = `${API_BASE_URL}/upload.php`;
const META_API_URL = `${API_BASE_URL}/video_meta_api.php`;
const LAST_PROCESSED_FILE = path.join(__dirname, 'last_processed_hadith.json');
const OUTPUT_METADATA_FILE = path.join(__dirname, 'videos_metadata.json');

// Ensure output directory exists
if (!fs.existsSync(VIDEO_OUTPUT_DIR)) {
    fs.mkdirSync(VIDEO_OUTPUT_DIR, { recursive: true });
}

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to get last processed Hadith number
function getLastProcessedHadith() {
    try {
        if (fs.existsSync(LAST_PROCESSED_FILE)) {
            const data = JSON.parse(fs.readFileSync(LAST_PROCESSED_FILE, 'utf8'));
            return data.lastHadithId || 0;
        }
    } catch (error) {
        console.error('Error reading last processed Hadith:', error.message);
    }
    return 0;
}

// Function to save last processed Hadith number
function saveLastProcessedHadith(hadithId) {
    try {
        fs.writeFileSync(LAST_PROCESSED_FILE, JSON.stringify({ lastHadithId: hadithId }));
    } catch (error) {
        console.error('Error saving last processed Hadith:', error.message);
    }
}

// Function to save video metadata
function saveVideoMetadata(metadata) {
    try {
        let existingData = { videos: [] };
        if (fs.existsSync(OUTPUT_METADATA_FILE)) {
            existingData = JSON.parse(fs.readFileSync(OUTPUT_METADATA_FILE, 'utf8'));
        }
        existingData.videos.push(metadata);
        fs.writeFileSync(OUTPUT_METADATA_FILE, JSON.stringify(existingData, null, 2));
        console.log(`Metadata saved to ${OUTPUT_METADATA_FILE}`);
    } catch (error) {
        console.error('Error saving video metadata:', error.message);
    }
}

async function uploadVideo(videoPath) {
    try {
        const formData = new FormData();
        formData.append('videoFile', fs.createReadStream(videoPath));

        const response = await axios.post(UPLOAD_API_URL, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        if (response.data.success) {
            console.log('Video uploaded successfully:', response.data.videoPath);
            return response.data.videoPath;
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        console.error('Error uploading video:', error.message);
        throw error;
    }
}

async function insertMetadata(metadata) {
    try {
        const response = await axios.post(META_API_URL, {
            ...metadata,
            bulk: false
        });

        if (response.data.success) {
            console.log('Metadata inserted successfully:', response.data);
            return response.data;
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        console.error('Error inserting metadata:', error.message);
        throw error;
    }
}

async function processHadith(hadithId) {
    try {
        // 1. Load Hadith data
        const hadithsData = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf8'));
        const hadith = hadithsData.find(h => h.globalId === hadithId);
        
        if (!hadith) {
            throw new Error(`Hadith ${hadithId} not found`);
        }

        console.log(`Processing Hadith ${hadithId}...`);

        // 2. Generate video
        const videoFileName = `hadith_${hadithId}_shorts.mp4`;
        const localVideoPath = path.join(VIDEO_OUTPUT_DIR, videoFileName);
        
        // Generate video using the correct function
        await generateHadithVideo(hadithId);
        
        if (!fs.existsSync(localVideoPath)) {
            throw new Error('Video generation failed');
        }

        console.log('Video generated successfully');

        // 3. Upload video to server
        const serverVideoPath = await uploadVideo(localVideoPath);
        console.log('Video uploaded to server:', serverVideoPath);

        // 4. Prepare metadata in the requested format
        const metadata = {
            uploadId: "",
            text: hadith.text,
            title: `#${hadith.globalId} h${hadith.globalId} b${hadith.bookNumber} h${hadith.numberInBook}`,
            description: `📚 Hadith ${hadith.globalId} from Sahih al-Bukhari\nBook ${hadith.bookNumber}, Hadith ${hadith.numberInBook}\n\n${hadith.text}\n\nNarrated by: ${hadith.narrator}\nReference: https://sunnah.com/bukhari/${hadith.globalId}`,
            image_url: "",
            video_path: "",
            local_path: localVideoPath,
            php_server_path: serverVideoPath,
            youtube_url: "",
            channel_url: "https://youtube.com/@YehAkhlaqeRasool"
        };

        // 5. Save metadata to local file
        saveVideoMetadata(metadata);

        // 6. Insert metadata into database
        await insertMetadata(metadata);
        console.log('Process completed successfully for Hadith', hadithId);

        // Save last processed Hadith ID
        saveLastProcessedHadith(hadithId);

        // Return the output file path and metadata for n8n
        return {
            outputFile: OUTPUT_METADATA_FILE,
            metadata: metadata
        };

    } catch (error) {
        console.error('Error processing Hadith:', error.message);
        throw error;
    }
}

// Main function to handle command line arguments and user input
async function main() {
    // Get Hadith ID from command line arguments
    const args = process.argv.slice(2);
    let hadithId = args[0] ? parseInt(args[0]) : null;

    // If no Hadith ID provided, prompt user
    if (!hadithId) {
        const lastProcessed = getLastProcessedHadith();
        const nextHadith = lastProcessed + 1;
        
        hadithId = await new Promise((resolve) => {
            rl.question(`Enter Hadith ID to process (last processed: ${lastProcessed}, suggested next: ${nextHadith}): `, (answer) => {
                resolve(parseInt(answer) || nextHadith);
            });
        });
    }

    try {
        const result = await processHadith(hadithId);
        console.log(`\nMetadata saved to: ${result.outputFile}`);
        // Output JSON for n8n
        console.log(JSON.stringify(result.metadata));
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run the main function
main(); 