/**
 * CommonJS script to add diverse test users to the CHARLEY database
 */

const http = require('http');

// Test profiles with Ghanaian and diaspora demographics
const TEST_PROFILES = [
  // Profile 1 - Tech Professional in Accra
  {
    fullName: "Kwame Addo",
    username: "kwame_tech2",
    email: "kwame.addo2@example.com",
    password: "Password123!",
    phoneNumber: "+233501234568",
    dateOfBirth: "1995-04-12",
    gender: "Male",
    bio: "Software engineer from Accra with a passion for building apps that solve everyday problems. I love cooking traditional Ghanaian dishes on weekends.",
    location: "Accra, Ghana",
    ethnicity: "Ashanti",
    profession: "Software Engineer",
    photoUrl: "https://randomuser.me/api/portraits/men/45.jpg",
    verifiedByPhone: true,
    religion: "Christian",
    relationshipGoal: "Long-term relationship"
  },
  
  // Profile 2 - Medical Professional in UK
  {
    fullName: "Abena Mensah",
    username: "abena_doc2",
    email: "abena.mensah2@example.com",
    password: "Password123!",
    phoneNumber: "+447868123457",
    dateOfBirth: "1990-11-18",
    gender: "Female",
    bio: "Doctor working in London but with strong ties to my Ghanaian heritage. I volunteer at medical camps when I visit Ghana and love organizing cultural events.",
    location: "London, UK",
    ethnicity: "Fante",
    profession: "Medical Doctor",
    photoUrl: "https://randomuser.me/api/portraits/women/22.jpg",
    verifiedByPhone: true,
    religion: "Christian",
    relationshipGoal: "Marriage"
  },
  
  // Profile 9 - Musician in Ghana
  {
    fullName: "Yaw Sarpong",
    username: "yaw_music",
    email: "yaw.sarpong@example.com",
    password: "Password123!",
    phoneNumber: "+233244567890",
    dateOfBirth: "1994-05-12",
    gender: "Male",
    bio: "Recording artist blending traditional Ghanaian sounds with modern afrobeats. I've performed across West Africa and am planning my first European tour next year.",
    location: "Accra, Ghana",
    ethnicity: "Fante",
    profession: "Musician",
    photoUrl: "https://randomuser.me/api/portraits/men/83.jpg",
    verifiedByPhone: true,
    religion: "Traditional",
    relationshipGoal: "Long-term relationship"
  },
  
  // Profile 10 - Nurse in Canada
  {
    fullName: "Adwoa Kyei",
    username: "adwoa_health",
    email: "adwoa.kyei@example.com",
    password: "Password123!",
    phoneNumber: "+14379876543",
    dateOfBirth: "1992-08-21",
    gender: "Female",
    bio: "Pediatric nurse with a passion for healthcare equality. I travel to Ghana yearly on medical missions. Looking to connect with others who value making a difference.",
    location: "Toronto, Canada",
    ethnicity: "Ashanti",
    profession: "Nurse",
    photoUrl: "https://randomuser.me/api/portraits/women/55.jpg",
    verifiedByPhone: true,
    religion: "Christian",
    relationshipGoal: "Marriage"
  },
  
  // Profile 11 - Environmental Scientist in Ghana
  {
    fullName: "Kwesi Owusu",
    username: "kwesi_eco",
    email: "kwesi.owusu@example.com",
    password: "Password123!",
    phoneNumber: "+233557654321",
    dateOfBirth: "1987-04-16",
    gender: "Male",
    bio: "Environmental scientist working on sustainable solutions for Ghana's coastal communities. I'm passionate about preserving our natural heritage while enabling economic growth.",
    location: "Cape Coast, Ghana",
    ethnicity: "Fante",
    profession: "Environmental Scientist",
    photoUrl: "https://randomuser.me/api/portraits/men/36.jpg",
    verifiedByPhone: true,
    religion: "Christian",
    relationshipGoal: "Long-term relationship"
  },
  
  // Profile 12 - Artist in UK
  {
    fullName: "Ekua Biney",
    username: "ekua_artist",
    email: "ekua.biney@example.com",
    password: "Password123!",
    phoneNumber: "+447700456789",
    dateOfBirth: "1995-12-03",
    gender: "Female",
    bio: "Visual artist exploring Ghanaian identity through contemporary art. My work has been featured in galleries in London, Accra, and Berlin. I draw inspiration from my dual cultural heritage.",
    location: "Manchester, UK",
    ethnicity: "Ga",
    profession: "Artist",
    photoUrl: "https://randomuser.me/api/portraits/women/39.jpg",
    verifiedByPhone: true,
    religion: "Spiritual",
    relationshipGoal: "Dating"
  }
];

// Main function to create users
async function createUsers() {
  console.log('===================================================');
  console.log('  ADDING MORE TEST USERS TO CHARLEY DATABASE');
  console.log('===================================================');
  console.log(`Total profiles to add: ${TEST_PROFILES.length}`);
  console.log('---------------------------------------------------');
  
  // Counter for successful registrations
  let successCount = 0;
  
  // Register each test profile
  for (const profile of TEST_PROFILES) {
    try {
      console.log(`Registering: ${profile.fullName} (${profile.username})`);
      
      // Prepare data for POST request
      const postData = JSON.stringify(profile);
      
      // Options for request
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/register',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      // Function to make the HTTP request
      const makeRequest = () => {
        return new Promise((resolve, reject) => {
          const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
              responseData += chunk;
            });
            
            res.on('end', () => {
              try {
                const parsedData = JSON.parse(responseData);
                resolve({ statusCode: res.statusCode, data: parsedData });
              } catch (error) {
                resolve({ 
                  statusCode: res.statusCode, 
                  data: { message: `Could not parse response: ${responseData.substring(0, 50)}...` } 
                });
              }
            });
          });
          
          req.on('error', (error) => {
            reject(error);
          });
          
          req.write(postData);
          req.end();
        });
      };
      
      // Make the request
      const response = await makeRequest();
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        console.log(`   ✅ SUCCESS! User ID: ${response.data.id}`);
        console.log(`   📍 Location: ${profile.location}`);
        console.log(`   💼 Profession: ${profile.profession}`);
        successCount++;
      } else {
        console.log(`   ❌ FAILED: ${response.data.message || 'Unknown error'}`);
        
        // If username exists already, try a variation
        if (response.data.message && response.data.message.includes('already exists')) {
          const randomSuffix = Math.floor(Math.random() * 10000);
          const modifiedProfile = { ...profile };
          modifiedProfile.username = `${profile.username}_${randomSuffix}`;
          modifiedProfile.email = `${profile.email.split('@')[0]}_${randomSuffix}@example.com`;
          console.log(`   🔄 Trying again with username: ${modifiedProfile.username}`);
          
          // Prepare data for retry POST request
          const retryPostData = JSON.stringify(modifiedProfile);
          options.headers['Content-Length'] = Buffer.byteLength(retryPostData);
          
          // Make the retry request
          const retryReq = http.request(options, (retryRes) => {
            let retryResponseData = '';
            
            retryRes.on('data', (chunk) => {
              retryResponseData += chunk;
            });
            
            retryRes.on('end', () => {
              try {
                const retryParsedData = JSON.parse(retryResponseData);
                if (retryRes.statusCode >= 200 && retryRes.statusCode < 300) {
                  console.log(`   ✅ SUCCESS on retry! User ID: ${retryParsedData.id}`);
                  successCount++;
                } else {
                  console.log(`   ❌ RETRY FAILED: ${retryParsedData.message || 'Unknown error'}`);
                }
              } catch (error) {
                console.log(`   ❌ RETRY FAILED: Could not parse response`);
              }
            });
          });
          
          retryReq.on('error', (error) => {
            console.error(`   ❌ RETRY ERROR: ${error.message}`);
          });
          
          retryReq.write(retryPostData);
          retryReq.end();
        }
      }
      
      console.log('---------------------------------------------------');
      
      // Add a delay between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`   ❌ ERROR: ${error.message}`);
      console.log('---------------------------------------------------');
    }
  }
  
  console.log('===================================================');
  console.log(`COMPLETED! Added ${successCount} out of ${TEST_PROFILES.length} test users.`);
  console.log('===================================================');
}

// Run the function
createUsers();