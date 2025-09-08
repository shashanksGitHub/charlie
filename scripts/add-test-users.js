/**
 * Script to add test users to the database
 * This creates a variety of profiles with different attributes for testing
 */

import fetch from 'node-fetch';

// Test profiles with Ghanaian demographics
const TEST_PROFILES = [
  {
    fullName: "Kwame Addo",
    username: "kwame_tech",
    email: "kwame.addo@example.com",
    password: "password123",
    phoneNumber: "+12015551234",
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
  {
    fullName: "Abena Mensah",
    username: "abena_doc",
    email: "abena.mensah@example.com",
    password: "password123",
    phoneNumber: "+447868123456",
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
  {
    fullName: "Kofi Boateng",
    username: "kofi_finance",
    email: "kofi.boateng@example.com",
    password: "password123",
    phoneNumber: "+16175551234",
    dateOfBirth: "1988-06-20",
    gender: "Male",
    bio: "Financial analyst based in Boston with roots in Kumasi. I travel back to Ghana twice a year and am looking to invest in Ghanaian startups.",
    location: "Boston, USA",
    ethnicity: "Ashanti",
    profession: "Financial Analyst",
    photoUrl: "https://randomuser.me/api/portraits/men/32.jpg",
    verifiedByPhone: true,
    religion: "Muslim",
    relationshipGoal: "Dating"
  },
  {
    fullName: "Ama Darko",
    username: "ama_designs",
    email: "ama.darko@example.com",
    password: "password123",
    phoneNumber: "+12105557890",
    dateOfBirth: "1993-09-05",
    gender: "Female",
    bio: "Fashion designer specializing in contemporary African fashion. My designs blend traditional Kente cloth with modern styles. I showcase annually at Accra Fashion Week.",
    location: "Kumasi, Ghana",
    ethnicity: "Ewe",
    profession: "Fashion Designer",
    photoUrl: "https://randomuser.me/api/portraits/women/67.jpg",
    verifiedByPhone: true,
    religion: "Traditional",
    relationshipGoal: "Long-term relationship"
  },
  {
    fullName: "Nii Armah",
    username: "nii_educator",
    email: "nii.armah@example.com",
    password: "password123",
    phoneNumber: "+14165557890",
    dateOfBirth: "1985-02-15",
    gender: "Male",
    bio: "University professor in Toronto specializing in African history. I organize cultural exchange programs between Canadian and Ghanaian universities.",
    location: "Toronto, Canada",
    ethnicity: "Ga",
    profession: "University Professor",
    photoUrl: "https://randomuser.me/api/portraits/men/58.jpg",
    verifiedByPhone: true,
    religion: "Christian",
    relationshipGoal: "Marriage"
  }
];

async function createUsers() {
  // Register endpoint URL
  const registerUrl = 'http://localhost:5000/api/register';

  console.log('Adding test users to the database...');
  
  // Counter for successful registrations
  let successCount = 0;
  
  // Register each test profile
  for (const profile of TEST_PROFILES) {
    try {
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Successfully registered user: ${profile.fullName} (ID: ${data.id})`);
        successCount++;
      } else {
        console.log(`❌ Failed to register user ${profile.fullName}: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`❌ Error registering user ${profile.fullName}:`, error.message);
    }
  }
  
  console.log(`\nCompleted! Added ${successCount} out of ${TEST_PROFILES.length} test users.`);
}

// Run the function
createUsers();