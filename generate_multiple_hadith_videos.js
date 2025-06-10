const { generateHadithVideo } = require('./generate_hadith_video');

async function generateMultipleHadithVideos() {
    const startHadithId = 1;
    const endHadithId = 100;

    console.log(`Starting generation of Hadith videos from ID ${startHadithId} to ${endHadithId}...`);

    for (let i = startHadithId; i <= endHadithId; i++) {
        console.log(`\n--- Processing Hadith Global ID: ${i} ---`);
        try {
            await generateHadithVideo(i);
            console.log(`Successfully generated video for Hadith Global ID: ${i}`);
        } catch (error) {
            console.error(`Error generating video for Hadith Global ID ${i}: ${error.message}`);
        }
    }

    console.log(`\nFinished generating Hadith videos from ID ${startHadithId} to ${endHadithId}.`);
}

generateMultipleHadithVideos(); 