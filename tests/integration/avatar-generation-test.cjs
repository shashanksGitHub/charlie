// Test script for avatar generation
const https = require('https');
const fs = require('fs');

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;
// Use the same model version as in avatar-service.ts
const REPLICATE_MODEL_VERSION = "makarovdmitrii/photobooth:9d6cdc048e8e8c4f316df1cafe53642fcc8987000daab11124f2fefb29da9602";

if (!REPLICATE_API_KEY) {
  console.error('REPLICATE_API_KEY environment variable is not set');
  process.exit(1);
}

// Sample image URL - this should be a direct URL to an image
// For testing purposes, we'll use a public placeholder image
const IMAGE_URL = "https://picsum.photos/200";

console.log(`Testing avatar generation with model: ${REPLICATE_MODEL_VERSION}`);
console.log(`Using image URL: ${IMAGE_URL}`);

// Function to make a POST request to Replicate API
function startPrediction() {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      version: REPLICATE_MODEL_VERSION,
      input: {
        image: IMAGE_URL
      }
    });

    const options = {
      hostname: 'api.replicate.com',
      path: '/v1/predictions',
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': requestData.length
      }
    };

    const req = https.request(options, (res) => {
      console.log(`Start prediction status: ${res.statusCode}`);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(data);
            console.log('Prediction started successfully');
            console.log(`Prediction ID: ${parsedData.id}`);
            resolve(parsedData);
          } catch (e) {
            console.error('Error parsing response:', e.message);
            console.log('Raw response:', data);
            reject(e);
          }
        } else {
          console.error('API Error:', data);
          reject(new Error(`API returned status code ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Connection error:', error.message);
      reject(error);
    });

    req.write(requestData);
    req.end();
  });
}

// Function to poll for prediction results
function checkPredictionStatus(predictionId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.replicate.com',
      path: `/v1/predictions/${predictionId}`,
      method: 'GET',
      headers: {
        'Authorization': `Token ${REPLICATE_API_KEY}`,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`API returned status code ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function generateAvatar() {
  try {
    // Start the prediction
    const prediction = await startPrediction();
    console.log('Polling for results...');
    
    // Poll for results (max 30 attempts, 2 second intervals)
    for (let i = 0; i < 30; i++) {
      console.log(`Checking status (attempt ${i+1}/30)...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      
      const status = await checkPredictionStatus(prediction.id);
      console.log(`Current status: ${status.status}`);
      
      if (status.status === 'succeeded') {
        console.log('Avatar generation successful!');
        console.log(`Generated avatar URL: ${status.output}`);
        return status.output;
      } else if (status.status === 'failed') {
        throw new Error(`Generation failed: ${status.error || 'Unknown error'}`);
      }
      // If still processing, continue polling
    }
    throw new Error('Avatar generation timed out after 60 seconds');
  } catch (error) {
    console.error('Avatar generation error:', error.message);
    throw error;
  }
}

// Run the test
generateAvatar()
  .then(avatarUrl => {
    console.log('Test completed successfully');
    console.log(`Final avatar URL: ${avatarUrl}`);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });