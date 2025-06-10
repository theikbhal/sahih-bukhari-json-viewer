const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Read the URLs from the text file
const urlFilePath = path.join(__dirname, 'images_url_list_working.txt');
const outputDir = __dirname;

async function downloadImage(url, index) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });

        const fileName = `image_${index}.jpg`;
        const filePath = path.join(outputDir, fileName);
        
        const writer = fs.createWriteStream(filePath);
        
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`Error downloading image ${index}: ${error.message}`);
    }
}

async function main() {
    try {
        // Read the URLs from the file
        const urls = fs.readFileSync(urlFilePath, 'utf8')
            .split('\n')
            .filter(url => url.trim() !== '');

        console.log(`Found ${urls.length} images to download`);

        // Download images sequentially
        for (let i = 0; i < urls.length; i++) {
            console.log(`Downloading image ${i + 1}/${urls.length}`);
            await downloadImage(urls[i], i + 1);
        }

        console.log('All images downloaded successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main(); 