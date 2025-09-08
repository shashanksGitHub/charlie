// Test script for avatar generation with Kandinsky-2 model
const https = require('https');

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;
const MODEL = 'ai-forever/kandinsky-2:3c6374e7a9a17e01afe306a5218cc67de55b19ea536466d6ea2602cfecea40a9';

if (!REPLICATE_API_KEY) {
  console.error('REPLICATE_API_KEY environment variable is not set');
  process.exit(1);
}

// Function to generate an avatar with Kandinsky model
async function generateAvatar() {
  const prompt = "Professional 3D avatar portrait of a person, highly detailed, photorealistic, modern, corporate style";
  
  console.log(`Generating avatar with prompt: "${prompt}"`);
  console.log(`Using model: ${MODEL}`);
  
  try {
    // 1. Start prediction
    console.log("\n=== Starting Prediction ===");
    const prediction = await startPrediction(prompt);
    console.log(`Prediction ID: ${prediction.id}`);
    console.log(`Status: ${prediction.status}`);
    
    // 2. Poll for results
    console.log("\n=== Polling for Results ===");
    const result = await pollForResult(prediction.id);
    
    console.log("\n=== Avatar Generation Complete ===");
    console.log(`Result URL: ${result}`);
    
    return result;
  } catch (error) {
    console.error("\n=== Avatar Generation Failed ===");
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

// Function to start a prediction
function startPrediction(prompt) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      version: MODEL.split(':')[1],
      input: {
        prompt: prompt,
        width: 768,
        height: 768,
        num_inference_steps: 50,
        guidance_scale: 7,
        scheduler: "dpmsolverMultistep",
        seed: Math.floor(Math.random() * 1000000)
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
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        } else {
          reject(new Error(`API returned status code ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(requestData);
    req.end();
  });
}

// Function to poll for prediction results
function pollForResult(predictionId, maxAttempts = 30) {
  return new Promise(async (resolve, reject) => {
    console.log(`Waiting for prediction results (polling ${maxAttempts} times)...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxAttempts}...`);
        
        const options = {
          hostname: 'api.replicate.com',
          path: `/v1/predictions/${predictionId}`,
          method: 'GET',
          headers: {
            'Authorization': `Token ${REPLICATE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        };
        
        const result = await new Promise((resolveRequest, rejectRequest) => {
          const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
              data += chunk;
            });
            
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsedData = JSON.parse(data);
                  resolveRequest(parsedData);
                } catch (e) {
                  rejectRequest(new Error(`Failed to parse response: ${e.message}`));
                }
              } else {
                rejectRequest(new Error(`API returned status code ${res.statusCode}: ${data}`));
              }
            });
          });
          
          req.on('error', (error) => {
            rejectRequest(error);
          });
          
          req.end();
        });
        
        console.log(`Current status: ${result.status}`);
        
        if (result.status === 'succeeded') {
          // For Kandinsky, the output is an array of image URLs
          return resolve(result.output[0]); // Return the first generated image
        } else if (result.status === 'failed') {
          return reject(new Error(`Prediction failed: ${result.error || 'Unknown error'}`));
        }
        
        // If still processing, wait 2 seconds before next attempt
        await new Promise(r => setTimeout(r, 2000));
      } catch (error) {
        console.error(`Error during polling attempt ${attempt}: ${error.message}`);
        // Continue polling despite errors
      }
    }
    
    reject(new Error(`Timed out after ${maxAttempts} polling attempts`));
  });
}

// Run the test
generateAvatar()
  .then(imageUrl => {
    console.log("\n=== Success ===");
    console.log(`Generated avatar URL: ${imageUrl}`);
    process.exit(0);
  })
  .catch(error => {
    console.error("\n=== Test Failed ===");
    console.error(error);
    process.exit(1);
  });