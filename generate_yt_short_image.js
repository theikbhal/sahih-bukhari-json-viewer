const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const ALL_HADITHS_FILE = path.join(__dirname, 'json', 'all_hadiths.json');
const OUTPUT_DIR = path.join(__dirname, 'yt_shorts_images');

const WIDTH = 1080; // YouTube Shorts width
const HEIGHT = 1920; // YouTube Shorts height
const FONT_SIZE_ENGLISH = 55; // Increased font size for English
const LINE_HEIGHT_ENGLISH = 75; // Increased line height for English
const PADDING = 60;

// Calculate heights for footer elements
const NARRATOR_FONT_SIZE = FONT_SIZE_ENGLISH - 5;
const BOOK_HADITH_FONT_SIZE = FONT_SIZE_ENGLISH - 15;
const GLOBAL_HADITH_FONT_SIZE = FONT_SIZE_ENGLISH - 20;
const LINK_FONT_SIZE = FONT_SIZE_ENGLISH - 15;

const ITEM_SPACING = 10; // Spacing between footer items

// Function to calculate the total height occupied by the footer elements
function calculateFooterHeight() {
    let height = PADDING; // Bottom padding
    height += NARRATOR_FONT_SIZE + ITEM_SPACING;
    height += BOOK_HADITH_FONT_SIZE + ITEM_SPACING;
    height += GLOBAL_HADITH_FONT_SIZE + ITEM_SPACING;
    height += LINK_FONT_SIZE + ITEM_SPACING;
    return height;
}

const FOOTER_HEIGHT = calculateFooterHeight();

// Core function to generate the image buffer for a single Hadith part
async function generateHadithImageContent(hadith, linesToDraw, partInfo = { isSplit: false, currentPart: 1, totalParts: 1 }) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // Set background color to black and text color to white
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = 'white';

    let mainTextTopYLimit = PADDING; // Default top limit for main text
    const mainTextBottomYLimit = HEIGHT - FOOTER_HEIGHT; // Bottom limit for main text

    // Draw "Part X of Y" at the top center if split
    if (partInfo.isSplit) {
        const partInfoText = `Part ${partInfo.currentPart} of ${partInfo.totalParts}`;
        ctx.font = `bold ${FONT_SIZE_ENGLISH - 5}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(partInfoText, WIDTH / 2, PADDING + (FONT_SIZE_ENGLISH - 5) / 2);
        mainTextTopYLimit = PADDING * 2 + FONT_SIZE_ENGLISH; // Adjust top limit for main text
    }

    // Draw English text
    ctx.font = `bold ${FONT_SIZE_ENGLISH}px Arial`;
    ctx.textAlign = 'left';

    const totalTextHeight = linesToDraw.length * LINE_HEIGHT_ENGLISH;

    // Calculate vertical centering for the main text within its available area
    const availableHeightForMainText = mainTextBottomYLimit - mainTextTopYLimit;
    let currentY = mainTextTopYLimit + (availableHeightForMainText - totalTextHeight) / 2;

    // Ensure text doesn't go above its top limit
    if (currentY < mainTextTopYLimit) {
        currentY = mainTextTopYLimit; // If text is too long, start exactly from top limit
    }
    // console.log('Current Part Lines to Draw:', linesToDraw);
    // console.log('Calculated totalTextHeight:', totalTextHeight);
    // console.log('Calculated starting currentY for text:', currentY);

    for (const line of linesToDraw) {
        ctx.fillText(line, PADDING, currentY);
        currentY += LINE_HEIGHT_ENGLISH;
    }

    // Add additional Hadith information at the bottom
    ctx.textAlign = 'left';
    ctx.fillStyle = 'white';

    let bottomY = HEIGHT - PADDING; // Start from bottom padding

    // Sunnah.com Link (6th priority)
    const sunnahLink = `https://sunnah.com/bukhari:${hadith.hadithGlobalNumber}`;
    ctx.font = `italic ${LINK_FONT_SIZE}px Arial`;
    ctx.fillText(`Link: ${sunnahLink}`, PADDING, bottomY);
    bottomY -= (LINK_FONT_SIZE + ITEM_SPACING);

    // Global Hadith Number (5th priority)
    ctx.font = `bold ${GLOBAL_HADITH_FONT_SIZE}px Arial`;
    ctx.fillText(`Global Hadith Number: ${hadith.hadithGlobalNumber}`, PADDING, bottomY);
    bottomY -= (GLOBAL_HADITH_FONT_SIZE + ITEM_SPACING);

    // Book Number and Hadith Number within Book (4th priority)
    ctx.font = `bold ${BOOK_HADITH_FONT_SIZE}px Arial`;
    ctx.fillText(`Book: ${hadith.bookNumber}, Hadith: ${hadith.hadithNumber}`, PADDING, bottomY);
    bottomY -= (BOOK_HADITH_FONT_SIZE + ITEM_SPACING);

    // Narrator (2nd priority)
    ctx.font = `bold ${NARRATOR_FONT_SIZE}px Arial`;
    ctx.fillText(`Narrated by: ${hadith.narrator.replace('Narrated ', '').replace(':', '')}`, PADDING, bottomY);

    return canvas.toBuffer('image/png');
}

// Helper function for word wrapping (now only does word wrapping within a single string)
function getLinesWordWrap(context, text, maxWidth, fontSize) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    // Set font for accurate measurement
    context.font = `bold ${fontSize}px Arial`;
    // console.log(`getLinesWordWrap: maxWidth=${maxWidth}, fontSize=${fontSize}, text="${text.substring(0, 50)}..."`);

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = context.measureText(testLine).width;
        // console.log(`  Word: "${word}", testLine: "${testLine}", testWidth: ${metrics.toFixed(2)}`);

        if (metrics > maxWidth && i > 0) {
            lines.push(currentLine.trim());
            // console.log(`    Line Wrapped: "${currentLine.trim()}"`);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine.trim() !== '') {
        lines.push(currentLine.trim());
        // console.log(`  Final Line Added: "${currentLine.trim()}"`);
    }
    // console.log('getLinesWordWrap Result:', lines);
    return lines;
}

// New helper function to prepare text by respecting newlines and breaking by sentences
function prepareTextForDrawing(text, context, maxWidth, fontSize) {
    const paragraphs = text.split(/\r?\n/); // Split by original newlines
    let finalLines = [];

    context.font = `bold ${fontSize}px Arial`; // Ensure font is set for measurement
    // console.log(`prepareTextForDrawing: maxWidth=${maxWidth}, fontSize=${fontSize}, rawText="${text.substring(0, 100)}..."`);

    for (const paragraph of paragraphs) {
        const trimmedParagraph = paragraph.trim();
        if (trimmedParagraph) {
            // Split each paragraph into sentences, keeping delimiters
            // Example: "Hello. World!" -> ["Hello.", " World!"]
            const sentences = trimmedParagraph.match(/[^.!?]+[.!?]\s*|[^.!?]+/g) || [];
            // console.log(`  Paragraph: "${trimmedParagraph.substring(0, 50)}...", Sentences:`, sentences);

            for (const sentence of sentences) {
                if (sentence.trim()) {
                    // Use getLinesWordWrap for each sentence
                    finalLines = finalLines.concat(getLinesWordWrap(context, sentence.trim(), maxWidth, fontSize));
                }
            }
        }
        // Add a deliberate blank line for paragraph separation if it's not the last paragraph 
        // and if the paragraph itself wasn't empty. This ensures we don't add extra blank lines if the original text was just \n\n
        if (trimmedParagraph && paragraphs.indexOf(paragraph) < paragraphs.length - 1) {
             finalLines.push(''); // Explicit blank line for paragraph breaks
            // console.log('  Added blank line for paragraph break.');
        }
    }

    // Remove any trailing empty lines if they were not intended as paragraph breaks (e.g., if the last original line was empty)
    while (finalLines.length > 0 && finalLines[finalLines.length - 1] === '') {
        finalLines.pop();
    }
    // console.log('prepareTextForDrawing Final Lines:', finalLines);
    return finalLines;
}

async function main() {
    console.log('Initializing Hadith image generation process...');

    // Load Hadith data once
    let hadiths = [];
    try {
        const data = fs.readFileSync(ALL_HADITHS_FILE, 'utf8');
        hadiths = JSON.parse(data);
        console.log(`Loaded ${hadiths.length} Hadiths from ${ALL_HADITHS_FILE}`);
    } catch (error) {
        console.error(`Error loading or parsing Hadith data: ${error.message}`);
        console.error("Please ensure 'all_hadiths.json' exists and is valid. Run 'node merge_hadiths.js'.");
        return;
    }

    // Find Hadith 7 to test splitting
    const hadithToProcess = hadiths.find(h => h.globalId === 7);

    if (!hadithToProcess) {
        console.error('Error: Hadith with globalId 7 not found in all_hadiths.json. Please choose a long Hadith for testing.');
        return;
    }

    console.log('Processing Hadith:', hadithToProcess.english.substring(0, 100) + '...');

    // Create a temporary canvas context for accurate measurement
    const tempCanvas = createCanvas(WIDTH, HEIGHT);
    const tempCtx = tempCanvas.getContext('2d');

    // Prepare all lines for the Hadith, respecting newlines and breaking at sentences
    const allLinesForHadith = prepareTextForDrawing(hadithToProcess.english, tempCtx, WIDTH - 2 * PADDING, FONT_SIZE_ENGLISH);

    // Calculate maximum number of lines that can fit in the main text area
    // This needs to account for top padding, bottom padding, and part info header if present
    const topSpaceForHeader = PADDING * 2 + FONT_SIZE_ENGLISH; // Space when split
    const bottomSpaceForFooter = FOOTER_HEIGHT; // The FOOTER_HEIGHT already includes bottom padding
    const effectiveAvailableHeight = HEIGHT - topSpaceForHeader - bottomSpaceForFooter;
    const MAX_LINES_PER_PART_EFFECTIVE = Math.floor(effectiveAvailableHeight / LINE_HEIGHT_ENGLISH);

    if (allLinesForHadith.length > MAX_LINES_PER_PART_EFFECTIVE) {
        console.log(`Hadith is too long (${allLinesForHadith.length} lines) and needs to be split into multiple parts (max ${MAX_LINES_PER_PART_EFFECTIVE} lines per part).`);
        let currentLineIndex = 0;
        let partNumber = 1;
        const totalParts = Math.ceil(allLinesForHadith.length / MAX_LINES_PER_PART_EFFECTIVE);

        while (currentLineIndex < allLinesForHadith.length) {
            const partLines = allLinesForHadith.slice(currentLineIndex, currentLineIndex + MAX_LINES_PER_PART_EFFECTIVE);

            const imageBuffer = await generateHadithImageContent(hadithToProcess, partLines, { isSplit: true, currentPart: partNumber, totalParts: totalParts });
            const outputPath = path.join(OUTPUT_DIR, `hadith_${hadithToProcess.globalId}_part_${partNumber}.png`);
            fs.writeFileSync(outputPath, imageBuffer);
            console.log(`Image saved to ${outputPath}`);

            currentLineIndex += MAX_LINES_PER_PART_EFFECTIVE;
            partNumber++;
        }
    } else {
        console.log('Hadith fits in a single image.');
        const imageBuffer = await generateHadithImageContent(hadithToProcess, allLinesForHadith);
        const outputPath = path.join(OUTPUT_DIR, `hadith_${hadithToProcess.globalId}.png`);
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`Image saved to ${outputPath}`);
    }

    console.log('Hadith image generation process completed.');
}

if (require.main === module) {
    main();
}

// Export functions and constants for external use
module.exports = {
    generateHadithImageContent,
    getLinesWordWrap,
    prepareTextForDrawing,
    calculateFooterHeight,
    WIDTH,
    HEIGHT,
    FONT_SIZE_ENGLISH,
    LINE_HEIGHT_ENGLISH,
    PADDING,
    FOOTER_HEIGHT,
    NARRATOR_FONT_SIZE,
    BOOK_HADITH_FONT_SIZE,
    GLOBAL_HADITH_FONT_SIZE,
    LINK_FONT_SIZE,
    ITEM_SPACING
}; 