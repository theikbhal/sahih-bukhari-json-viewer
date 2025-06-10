const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

// Configuration
const IMAGES_DIR = path.join(__dirname, 'images');
const TEMPLATE_PATH = path.join(__dirname, 'videos', 'templates', 'image_template.html');
const OUTPUT_DIR = path.join(__dirname, 'generated_images');
const TEST_FILE_HTML = path.join(OUTPUT_DIR, 'test_hadith.html');
const TEST_FILE_JPG = path.join(OUTPUT_DIR, 'test_hadith.jpg');

// IMPORTANT: Specify the path to your Chrome/Chromium executable
// For Windows, it might be something like: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
// For macOS: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
// For Linux: '/usr/bin/google-chrome'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; // !!! CHANGE THIS TO YOUR CHROME PATH !!!

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get first image file
function getFirstImageFile() {
    const files = fs.readdirSync(IMAGES_DIR)
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
        })
        .map(file => path.join(IMAGES_DIR, file));
    
    return files[0]; // Return first image
}

// Convert image to base64
function imageToBase64(imagePath) {
    try {
        console.log('Converting image:', imagePath);
        const imageBuffer = fs.readFileSync(imagePath);
        const base64 = imageBuffer.toString('base64');
        const ext = path.extname(imagePath).toLowerCase().substring(1);
        // Ensure proper MIME type
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext;
        return `data:image/${mimeType};base64,${base64}`;
    } catch (error) {
        console.error(`Error converting image to base64: ${error.message}`);
        return null;
    }
}

// Generate HTML with base64 image
function generateHtml(hadith, imageBase64) {
    try {
        console.log('Reading template...');
        let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
        console.log('Replacing placeholders...');
        // Replace placeholders with actual content
        template = template.replace('PLACEHOLDER_IMAGE', imageBase64);
        template = template.replace('HADITH_TEXT', hadith.text);
        template = template.replace('HADITH_NUMBER', hadith.number);
        return template;
    } catch (error) {
        console.error(`Error generating HTML: ${error.message}`);
        return null;
    }
}

// Main function
async function generateTestImage() {
    let browser;
    try {
        // Get first image
        const imagePath = getFirstImageFile();
        if (!imagePath) {
            throw new Error('No images found in the images directory');
        }
        console.log('Found image:', imagePath);

        // Create test hadith
        const testHadith = {
            number: 1,
            text: "This is a test hadith to verify the template and image generation. This should appear on a background image."
        };

        // Convert image to base64
        const imageBase64 = imageToBase64(imagePath);
        if (!imageBase64) {
            throw new Error('Failed to convert image to base64');
        }
        console.log('Image converted to base64 successfully');

        // Generate HTML
        const html = generateHtml(testHadith, imageBase64);
        if (!html) {
            throw new Error('Failed to generate HTML');
        }

        // Save HTML for debugging/verification
        fs.writeFileSync(TEST_FILE_HTML, html);
        console.log('Test HTML file generated at:', TEST_FILE_HTML);

        // Launch Puppeteer and take screenshot
        console.log('Launching Puppeteer...');
        browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            headless: 'new' // Use 'new' for the new headless mode
        });
        const page = await browser.newPage();

        // Set viewport to YouTube Shorts dimensions
        await page.setViewport({ width: 1080, height: 1920 });

        // Load HTML content into the page
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Take screenshot
        await page.screenshot({
            path: TEST_FILE_JPG,
            type: 'jpeg',
            quality: 90,
            fullPage: true
        });
        console.log('Test image generated successfully at:', TEST_FILE_JPG);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
            console.log('Puppeteer browser closed.');
        }
    }
}

// Run the script
generateTestImage(); 