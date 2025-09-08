// Detailed test script for Replicate API
const https = require('https');
const fs = require('fs');

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

if (!REPLICATE_API_KEY) {
  console.error('REPLICATE_API_KEY environment variable is not set');
  process.exit(1);
}

console.log(`Testing Replicate API with key starting with: ${REPLICATE_API_KEY.substring(0, 4)}...`);

// First, list available models to find one we can use
function listModels() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.replicate.com',
      path: '/v1/models',
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

// Find a specific model
function getModel(owner, name) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.replicate.com',
      path: `/v1/models/${owner}/${name}`,
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

// Find latest version
function getLatestVersion(modelUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.replicate.com',
      path: `${new URL(modelUrl).pathname}/versions`,
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
            resolve(parsedData.results[0]);
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

async function runDetailedTest() {
  try {
    console.log("\n=== Step 1: List Available Models ===");
    const models = await listModels();
    console.log(`Retrieved ${models.results.length} models`);
    
    // Find an avatar or portrait model
    const portraitModels = models.results.filter(model => {
      const name = model.name ? model.name.toLowerCase() : '';
      const description = model.description ? model.description.toLowerCase() : '';
      
      return name.includes('portrait') || 
             name.includes('avatar') ||
             description.includes('portrait') || 
             description.includes('avatar');
    });
    
    if (portraitModels.length > 0) {
      console.log(`\nFound ${portraitModels.length} portrait/avatar related models`);
      console.log("Top 3 matches:");
      portraitModels.slice(0, 3).forEach((model, i) => {
        const description = model.description ? 
          `${model.description.substring(0, 100)}...` : 
          'No description available';
        console.log(`${i+1}. ${model.owner}/${model.name}: ${description}`);
      });
      
      // Select first portrait model
      const selectedModel = portraitModels[0];
      console.log(`\n=== Step 2: Selected Model: ${selectedModel.owner}/${selectedModel.name} ===`);
      
      // Get model details
      const modelDetails = await getModel(selectedModel.owner, selectedModel.name);
      console.log(`Model URL: ${modelDetails.url}`);
      console.log(`Latest Version: ${modelDetails.latest_version?.id || "Unknown"}`);
      
      if (modelDetails.latest_version) {
        console.log("\n=== Step 3: Model Version Details ===");
        console.log(`ID: ${modelDetails.latest_version.id}`);
        console.log(`Created: ${modelDetails.latest_version.created_at}`);
        console.log(`Required Input Parameters:`, modelDetails.latest_version.openapi_schema?.components?.schemas?.Input?.properties || {});
        
        // Now we have all the info needed to run the model properly
        console.log("\n=== Model is available and ready to use ===");
        console.log(`To use this model, specify the version: ${selectedModel.owner}/${selectedModel.name}:${modelDetails.latest_version.id}`);
        
        return {
          owner: selectedModel.owner,
          name: selectedModel.name,
          version: modelDetails.latest_version.id,
          inputParams: modelDetails.latest_version.openapi_schema?.components?.schemas?.Input?.properties || {}
        };
      } else {
        console.log("No latest version found for this model");
      }
    } else {
      console.log("No portrait or avatar related models found");
      
      // Just pick the first available model
      const firstModel = models.results[0];
      console.log(`\nUsing first available model: ${firstModel.owner}/${firstModel.name}`);
      
      const modelDetails = await getModel(firstModel.owner, firstModel.name);
      const latestVersion = await getLatestVersion(modelDetails.url);
      
      console.log(`Latest version: ${latestVersion.id}`);
      console.log(`Required input parameters:`, latestVersion.openapi_schema?.components?.schemas?.Input?.properties || {});
      
      return {
        owner: firstModel.owner,
        name: firstModel.name,
        version: latestVersion.id,
        inputParams: latestVersion.openapi_schema?.components?.schemas?.Input?.properties || {}
      };
    }
  } catch (error) {
    console.error("Error running detailed test:", error.message);
    throw error;
  }
}

// Run the test and show results
runDetailedTest()
  .then(modelInfo => {
    console.log("\n=== Summary ===");
    console.log(`Selected model: ${modelInfo.owner}/${modelInfo.name}:${modelInfo.version}`);
    console.log("Required input parameters:", Object.keys(modelInfo.inputParams));
    
    // Save info to a file for reference
    fs.writeFileSync('model-info.json', JSON.stringify(modelInfo, null, 2));
    console.log("\nModel information saved to model-info.json");
  })
  .catch(error => {
    console.error("\nTest failed:", error);
    process.exit(1);
  });