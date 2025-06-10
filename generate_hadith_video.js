const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

// Import image generation functions and constants
const { 
    generateHadithImageContent, 
    prepareTextForDrawing, 
    WIDTH, 
    HEIGHT, 
    FONT_SIZE_ENGLISH, 
    LINE_HEIGHT_ENGLISH,
    PADDING,
    FOOTER_HEIGHT
} = require('./generate_yt_short_image.js');

const ALL_HADITHS_FILE = path.join(__dirname, 'json', 'all_hadiths.json');
const TEMP_IMAGES_DIR = path.join(__dirname, 'temp_yt_shorts_images'); // Temporary directory for images
const OUTPUT_VIDEO_DIR = __dirname; // Output video to the current directory
const FFMPEG_INPUT_LIST = path.join(__dirname, 'ffmpeg_input.txt');
const LAST_HADITH_ID_FILE = path.join(__dirname, 'last_hadith_id.json');

const DURATION_SINGLE_IMAGE = 20; // seconds for Hadiths that fit in one image
const DURATION_MULTI_PART_IMAGE = 3; // seconds for each part of a split Hadith

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function readLastHadithId() {
    try {
        if (fs.existsSync(LAST_HADITH_ID_FILE)) {
            const data = fs.readFileSync(LAST_HADITH_ID_FILE, 'utf8');
            return JSON.parse(data).lastId;
        }
    } catch (error) {
        console.error(`Error reading last Hadith ID file: ${error.message}`);
    }
    return null;
}

function writeLastHadithId(id) {
    try {
        fs.writeFileSync(LAST_HADITH_ID_FILE, JSON.stringify({ lastId: id }), 'utf8');
        console.log(`Last generated Hadith ID updated to: ${id}`);
    } catch (error) {
        console.error(`Error writing last Hadith ID file: ${error.message}`);
    }
}

async function generateHadithVideo(targetGlobalHadithId = null) {
    console.log('Starting Hadith video generation...');

    // Ensure temporary image directory exists
    if (!fs.existsSync(TEMP_IMAGES_DIR)) {
        fs.mkdirSync(TEMP_IMAGES_DIR, { recursive: true });
        console.log(`Created temporary image directory: ${TEMP_IMAGES_DIR}`);
    }

    // Load Hadith data once
    let allHadiths = [];
    try {
        const data = fs.readFileSync(ALL_HADITHS_FILE, 'utf8');
        allHadiths = JSON.parse(data);
        console.log(`Loaded ${allHadiths.length} Hadiths from ${ALL_HADITHS_FILE}`);
    } catch (error) {
        console.error(`Error loading or parsing Hadith data: ${error.message}`);
        console.error("Please ensure 'all_hadiths.json' exists and is valid. Run 'node merge_hadiths.js'.");
        rl.close();
        return;
    }

    let hadithsToProcess = [];
    if (targetGlobalHadithId) {
        const foundHadith = allHadiths.find(h => h.globalId === targetGlobalHadithId);
        if (foundHadith) {
            hadithsToProcess.push(foundHadith);
            console.log(`Processing Hadith Global ID: ${targetGlobalHadithId}`);
        } else {
            console.error(`Error: Hadith with globalId ${targetGlobalHadithId} not found.`);
            rl.close();
            return;
        }
    } else {
        hadithsToProcess = allHadiths; // Process all Hadiths
        console.log(`Processing all ${hadithsToProcess.length} Hadiths.`);
    }

    const generatedImagePaths = [];

    // Create a temporary canvas context for accurate measurement for prepareTextForDrawing
    const { createCanvas } = require('canvas'); // Import here to avoid circular dependency issues
    const tempCanvas = createCanvas(WIDTH, HEIGHT);
    const tempCtx = tempCanvas.getContext('2d');

    for (const hadith of hadithsToProcess) {
        const cleanEnglishText = hadith.english; // prepareTextForDrawing handles newlines now
        const allLinesForHadith = prepareTextForDrawing(cleanEnglishText, tempCtx, WIDTH - 2 * PADDING, FONT_SIZE_ENGLISH);

        // Calculate maximum number of lines that can fit in the main text area
        const topSpaceForHeader = PADDING * 2 + FONT_SIZE_ENGLISH; // Space when split
        const bottomSpaceForFooter = FOOTER_HEIGHT; // The FOOTER_HEIGHT already includes bottom padding
        const effectiveAvailableHeight = HEIGHT - topSpaceForHeader - bottomSpaceForFooter;
        const MAX_LINES_PER_PART_EFFECTIVE = Math.floor(effectiveAvailableHeight / LINE_HEIGHT_ENGLISH);

        if (allLinesForHadith.length > MAX_LINES_PER_PART_EFFECTIVE) {
            console.log(`Hadith ${hadith.globalId} is too long (${allLinesForHadith.length} lines) and needs to be split into multiple parts (max ${MAX_LINES_PER_PART_EFFECTIVE} lines per part).`);
            let currentLineIndex = 0;
            let partNumber = 1;
            const totalParts = Math.ceil(allLinesForHadith.length / MAX_LINES_PER_PART_EFFECTIVE);

            while (currentLineIndex < allLinesForHadith.length) {
                const partLines = allLinesForHadith.slice(currentLineIndex, currentLineIndex + MAX_LINES_PER_PART_EFFECTIVE);

                const imageBuffer = await generateHadithImageContent(hadith, partLines, { isSplit: true, currentPart: partNumber, totalParts: totalParts });
                const outputPath = path.join(TEMP_IMAGES_DIR, `hadith_${hadith.globalId}_part_${partNumber}.png`);
                fs.writeFileSync(outputPath, imageBuffer);
                generatedImagePaths.push(outputPath);
                console.log(`Generated image for Hadith ${hadith.globalId}, Part ${partNumber}: ${outputPath}`);

                // Calculate duration based on number of parts
                const duration = totalParts > 1 ? DURATION_MULTI_PART_IMAGE : DURATION_SINGLE_IMAGE; // Use defined constants

                // Add entry to FFmpeg input list
                const inputListEntry = `file '${outputPath}'\nduration ${duration}\n`;
                fs.appendFileSync(FFMPEG_INPUT_LIST, inputListEntry);

                currentLineIndex += MAX_LINES_PER_PART_EFFECTIVE;
                partNumber++;
            }
        } else {
            console.log(`Hadith ${hadith.globalId} fits in a single image.`);
            const imageBuffer = await generateHadithImageContent(hadith, allLinesForHadith);
            const outputPath = path.join(TEMP_IMAGES_DIR, `hadith_${hadith.globalId}.png`);
            fs.writeFileSync(outputPath, imageBuffer);
            generatedImagePaths.push(outputPath);
            console.log(`Generated image for Hadith ${hadith.globalId}: ${outputPath}`);

            // Calculate duration for single image Hadiths
            const duration = DURATION_SINGLE_IMAGE; // Use defined constant

            // Add entry to FFmpeg input list
            const inputListEntry = `file '${outputPath}'\nduration ${duration}\n`;
            fs.appendFileSync(FFMPEG_INPUT_LIST, inputListEntry);
        }
    }

    if (generatedImagePaths.length === 0) {
        console.error('No images were generated for video creation.');
        rl.close();
        return;
    }

    // Sort generated image paths to ensure correct order in video
    generatedImagePaths.sort((a, b) => {
        const parseFilename = (filepath) => {
            const filename = path.basename(filepath);
            const parts = filename.match(/hadith_(\d+)(?:_part_(\d+))?\.png/);
            if (!parts) return { globalId: 0, partNumber: 0 }; // Handle malformed filenames gracefully
            const globalId = parseInt(parts[1]);
            const partNumber = parts[2] ? parseInt(parts[2]) : 1; // Default to 1 for single images
            return { globalId, partNumber };
        };

        const aInfo = parseFilename(a);
        const bInfo = parseFilename(b);

        if (aInfo.globalId !== bInfo.globalId) {
            return aInfo.globalId - bInfo.globalId;
        }
        return aInfo.partNumber - bInfo.partNumber;
    });

    let ffmpegInputContent = '';
    const hadithPartCounts = {};

    // First pass to determine part counts for duration logic based on current generatedImagePaths
    generatedImagePaths.forEach(filepath => {
        const filename = path.basename(filepath);
        const match = filename.match(/hadith_(\d+)(?:_part_(\d+))?\.png/);
        if (match) {
            const globalId = match[1];
            if (!hadithPartCounts[globalId]) {
                hadithPartCounts[globalId] = 0;
            }
            hadithPartCounts[globalId]++;
        }
    });

    // Second pass to create the concat list with correct durations
    ffmpegInputContent = ''; // Reset for the second pass
    generatedImagePaths.forEach(filepath => {
        const filename = path.basename(filepath);
        const match = filename.match(/hadith_(\d+)(?:_part_(\d+))?\.png/);
        if (match) {
            const globalId = match[1];
            const totalParts = hadithPartCounts[globalId];
            const duration = totalParts > 1 ? DURATION_MULTI_PART_IMAGE : DURATION_SINGLE_IMAGE;
            ffmpegInputContent += `file '${filepath}'\nduration ${duration}\n`;
        }
    });
    
    fs.writeFileSync(FFMPEG_INPUT_LIST, ffmpegInputContent);
    console.log(`FFmpeg input list created at ${FFMPEG_INPUT_LIST}`);

    const outputVideoPath = path.join(OUTPUT_VIDEO_DIR, `hadith_${targetGlobalHadithId}_shorts.mp4`);
    // Ensure the output directory for the final video exists
    const finalVideoOutputDir = path.dirname(outputVideoPath); 
    if (!fs.existsSync(finalVideoOutputDir)) {
        fs.mkdirSync(finalVideoOutputDir, { recursive: true });
    }

    // FFmpeg command to concatenate images into a video
    const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${FFMPEG_INPUT_LIST}" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1" -pix_fmt yuv420p -c:v libx264 -preset medium -crf 23 -r 30 "${outputVideoPath}"`;

    console.log(`Executing FFmpeg command: ${ffmpegCommand}`);

    return new Promise((resolve, reject) => {
        exec(ffmpegCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`FFmpeg execution error: ${error.message}`);
                console.error(`FFmpeg stderr: ${stderr}`);
                cleanupTempFiles(generatedImagePaths);
                reject(new Error(`FFmpeg video generation failed: ${error.message}`));
                return;
            }
            if (stderr) {
                console.warn(`FFmpeg stderr (warnings/info): ${stderr}`);
            }
            console.log(`FFmpeg stdout: ${stdout}`);
            console.log(`Video created successfully at ${outputVideoPath}`);

            // Clean up temporary image files
            cleanupTempFiles(generatedImagePaths);
            fs.unlinkSync(FFMPEG_INPUT_LIST); // Clean up the input list file as well
            resolve(outputVideoPath);
        });
    });
}

function cleanupTempFiles(filePaths) {
    console.log('Cleaning up temporary image files...');
    filePaths.forEach(filePath => {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error(`Error deleting temporary file ${filePath}: ${error.message}`);
        }
    });
    try {
        // Attempt to remove the temporary directory if it's empty
        fs.rmdirSync(TEMP_IMAGES_DIR, { recursive: false });
        console.log(`Removed temporary image directory: ${TEMP_IMAGES_DIR}`);
    } catch (error) {
        console.warn(`Could not remove temporary directory ${TEMP_IMAGES_DIR}. It might not be empty: ${error.message}`);
    }
}

// Main function to handle command line arguments and user input
async function main() {
    const lastHadithId = readLastHadithId();
    let suggestedNextId = lastHadithId ? lastHadithId + 1 : 1;

    const answer = await askQuestion(`Enter Hadith Global ID (e.g., 1, or 'all' for all Hadiths) [${suggestedNextId}]: `);

    if (answer.toLowerCase() === 'all') {
        // Process all Hadiths, will be handled by generateHadithVideo internally
        await generateHadithVideo(); 
        writeLastHadithId(0); // Reset last processed ID if all are processed
    } else {
        const hadithId = parseInt(answer || suggestedNextId);
        if (isNaN(hadithId) || hadithId <= 0) {
            console.error('Invalid Hadith ID. Please enter a positive number or \'all\'.');
            rl.close();
            return;
        }
        await generateHadithVideo(hadithId);
        writeLastHadithId(hadithId);
    }

    rl.close();
}

// Only run main() if the script is executed directly
if (require.main === module) {
    main();
}

// Export the generateHadithVideo function for use in other modules
module.exports = { generateHadithVideo }; 