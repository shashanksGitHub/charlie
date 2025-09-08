// Simple test for Replicate API with a specific model
const https = require('https');

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;
const MODEL_OWNER = 'ai-forever';
const MODEL_NAME = 'kandinsky-2';

if (!REPLICATE_API_KEY) {
  console.error('REPLICATE_API_KEY environment variable is not set');
  process.exit(1);
}

console.log(`Testing Replicate API connection with ${MODEL_OWNER}/${MODEL_NAME} model`);

// Get model information
function getModelInfo() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.replicate.com',
      path: `/v1/models/${MODEL_OWNER}/${MODEL_NAME}`,
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

// Main function to test with a known model
async function testWithKnownModel() {
  try {
    console.log('Getting model information...');
    const modelInfo = await getModelInfo();
    
    console.log('\n=== Model Information ===');
    console.log(`Name: ${modelInfo.name}`);
    console.log(`Description: ${modelInfo.description ? modelInfo.description.substring(0, 100) + '...' : 'No description'}`);
    console.log(`Latest Version: ${modelInfo.latest_version?.id || 'Unknown'}`);
    
    if (modelInfo.latest_version) {
      const version = modelInfo.latest_version;
      console.log('\n=== Latest Version Details ===');
      console.log(`ID: ${version.id}`);
      console.log(`Created: ${version.created_at}`);
      
      // Extract input parameters
      const inputSchema = version.openapi_schema?.components?.schemas?.Input?.properties || {};
      console.log('\n=== Required Parameters ===');
      Object.entries(inputSchema).forEach(([param, details]) => {
        console.log(`- ${param}: ${details.type || 'unknown type'} ${details.description ? '(' + details.description.substring(0, 50) + '...)' : ''}`);
      });
      
      console.log('\n=== Connection Test Result ===');
      console.log('Replicate API connection: SUCCESS');
      console.log(`Model ${MODEL_OWNER}/${MODEL_NAME} is available and can be used with version: ${version.id}`);
      
      return {
        success: true,
        model: `${MODEL_OWNER}/${MODEL_NAME}`,
        version: version.id,
        inputParams: inputSchema
      };
    } else {
      console.log('\n=== Connection Test Result ===');
      console.log('WARNING: Model found but no latest version available');
      return {
        success: true,
        warning: 'No latest version found',
        model: `${MODEL_OWNER}/${MODEL_NAME}`
      };
    }
  } catch (error) {
    console.error('\n=== Connection Test Result ===');
    console.error(`ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testWithKnownModel()
  .then(result => {
    console.log('\nTest completed.');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });