#!/usr/bin/env node

/**
 * Script to add diverse test users to the CHARLEY database
 * This creates a variety of profiles with different attributes for testing
 */

// Test profiles with Ghanaian and diaspora demographics
const TEST_PROFILES = [
  // Profile 1 - Tech Professional in Accra
  {
    fullName: "Kwame Addo",
    username: "kwame_tech",
    email: "kwame.addo@example.com",
    password: "Password123!",
    phoneNumber: "+233501234567",
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
    username: "abena_doc",
    email: "abena.mensah@example.com",
    password: "Password123!",
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
  
  // Profile 3 - Financial Analyst in USA
  {
    fullName: "Kofi Boateng",
    username: "kofi_finance",
    email: "kofi.boateng@example.com",
    password: "Password123!",
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
  
  // Profile 4 - Fashion Designer in Kumasi
  {
    fullName: "Ama Darko",
    username: "ama_designs",
    email: "ama.darko@example.com",
    password: "Password123!",
    phoneNumber: "+233551237890",
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
  
  // Profile 5 - Academic in Canada
  {
    fullName: "Nii Armah",
    username: "nii_educator",
    email: "nii.armah@example.com",
    password: "Password123!",
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
  },
  
  // Profile 6 - Student in UK
  {
    fullName: "Efua Mensah",
    username: "efua_student",
    email: "efua.mensah@example.com",
    password: "Password123!",
    phoneNumber: "+447700900123",
    dateOfBirth: "1998-07-25",
    gender: "Female", 
    bio: "Studying International Relations at LSE. I love exploring the connections between Ghana and global politics. On weekends, I volunteer teaching Ghanaian culture to children in London.",
    location: "London, UK",
    ethnicity: "Fante",
    profession: "Student",
    photoUrl: "https://randomuser.me/api/portraits/women/33.jpg",
    verifiedByPhone: true,
    religion: "Christian",
    relationshipGoal: "Dating"
  },
  
  // Profile 7 - Chef in Ghana
  {
    fullName: "Kojo Annan",
    username: "kojo_chef",
    email: "kojo.annan@example.com",
    password: "Password123!",
    phoneNumber: "+233207654321",
    dateOfBirth: "1991-11-30",
    gender: "Male",
    bio: "Award-winning chef specializing in modern Ghanaian cuisine. I believe our traditional foods can be elevated to fine dining experiences while maintaining cultural authenticity.",
    location: "Accra, Ghana",
    ethnicity: "Akan",
    profession: "Chef",
    photoUrl: "https://randomuser.me/api/portraits/men/79.jpg",
    verifiedByPhone: true,
    religion: "Christian",
    relationshipGoal: "Long-term relationship"
  },
  
  // Profile 8 - Tech Entrepreneur in USA
  {
    fullName: "Akosua Poku",
    username: "akosua_tech",
    email: "akosua.poku@example.com",
    password: "Password123!",
    phoneNumber: "+14157891234",
    dateOfBirth: "1989-03-07",
    gender: "Female",
    bio: "Founded a tech startup connecting African artisans to global markets. Born in Kumasi, educated at Stanford, and now building bridges between Silicon Valley and Ghana's tech scene.",
    location: "San Francisco, USA",
    ethnicity: "Ashanti",
    profession: "Tech Entrepreneur",
    photoUrl: "https://randomuser.me/api/portraits/women/29.jpg",
    verifiedByPhone: true,
    religion: "Christian", 
    relationshipGoal: "Dating"
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
  // Register endpoint URL - use localhost since we're running this locally
  const registerUrl = 'http://localhost:5000/api/register';
  
  console.log('===================================================');
  console.log('  ADDING DIVERSE TEST USERS TO CHARLEY DATABASE');
  console.log('===================================================');
  console.log(`Total profiles to add: ${TEST_PROFILES.length}`);
  console.log('---------------------------------------------------');
  
  // Counter for successful registrations
  let successCount = 0;
  
  // Register each test profile
  for (const profile of TEST_PROFILES) {
    try {
      // Randomize the dateOfBirth slightly to avoid exact same birthdays
      const dobDate = new Date(profile.dateOfBirth);
      // Adjust by random days (± 10 days)
      dobDate.setDate(dobDate.getDate() + Math.floor(Math.random() * 20) - 10);
      profile.dateOfBirth = dobDate.toISOString().split('T')[0];
      
      console.log(`Registering: ${profile.fullName} (${profile.username})`);
      
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile)
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.log(`   Response not JSON: ${await response.text().slice(0, 50)}...`);
        continue;
      }
      
      if (response.ok) {
        console.log(`   ✅ SUCCESS! User ID: ${data.id}`);
        console.log(`   📍 Location: ${profile.location}`);
        console.log(`   💼 Profession: ${profile.profession}`);
        successCount++;
      } else {
        console.log(`   ❌ FAILED: ${data.message || 'Unknown error'}`);
        // If username exists already, try a variation
        if (data.message && data.message.includes('already exists')) {
          const randomSuffix = Math.floor(Math.random() * 10000);
          profile.username = `${profile.username}_${randomSuffix}`;
          profile.email = `${profile.email.split('@')[0]}_${randomSuffix}@example.com`;
          console.log(`   🔄 Trying again with username: ${profile.username}`);
          
          // Try again with modified username
          const retryResponse = await fetch(registerUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(profile)
          });
          
          const retryData = await retryResponse.json();
          
          if (retryResponse.ok) {
            console.log(`   ✅ SUCCESS on retry! User ID: ${retryData.id}`);
            successCount++;
          } else {
            console.log(`   ❌ RETRY FAILED: ${retryData.message || 'Unknown error'}`);
          }
        }
      }
      console.log('---------------------------------------------------');
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