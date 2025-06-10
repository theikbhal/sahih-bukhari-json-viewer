const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const inputFile = path.join(__dirname, 'webp_images.txt');
const outputDir = __dirname;

async function convertWebPToJpeg(webpPath, index) {
    try {
        const outputPath = path.join(outputDir, `converted_${index}.jpg`);
        
        await sharp(webpPath)
            .jpeg({ quality: 90 })
            .toFile(outputPath);
            
        console.log(`Converted image ${index} successfully`);
    } catch (error) {
        console.error(`Error converting image ${index}: ${error.message}`);
    }
}

async function main() {
    try {
        // Read the WebP file paths from the text file
        const webpPaths = fs.readFileSync(inputFile, 'utf8')
            .split('\n')
            .filter(path => path.trim() !== '');

        console.log(`Found ${webpPaths.length} images to convert`);

        // Convert images sequentially
        for (let i = 0; i < webpPaths.length; i++) {
            console.log(`Converting image ${i + 1}/${webpPaths.length}`);
            await convertWebPToJpeg(webpPaths[i].trim(), i + 1);
        }

        console.log('All images converted successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main(); 