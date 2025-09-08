#!/usr/bin/env node

/**
 * TF-IDF SIMILARITY ALGORITHM EXPLANATION
 * Using Enhanced 6-Field Textual Content Analysis
 * 
 * REAL USER EXAMPLE: Chima (User 11) vs Thibaut (User 2)
 * Demonstrates comprehensive textual content processing with all fields
 */

console.log('\n🔍 TF-IDF SIMILARITY ALGORITHM EXPLANATION');
console.log('Enhanced 6-Field Textual Content Analysis');
console.log('=========================================\n');

// Real user data from CHARLEY platform
const realUsers = {
  chima: {
    id: 11,
    name: "Chima",
    bio: "Love exploring new cultures and connecting with like-minded people. Passionate about technology and making meaningful relationships.",
    profession: "Software Engineer",
    interests: '["Technology", "Travel", "Music", "Reading", "Photography"]', // JSON string from database
    relationshipGoal: "Looking for serious long-term relationship leading to marriage",
    highSchool: "Lagos High School", 
    collegeUniversity: "University of Texas at Austin"
  },
  thibaut: {
    id: 2,
    name: "Thibaut",
    bio: "Goalkeeper with a passion for excellence and dedication. Love challenges and building strong connections.",
    profession: "Professional Athlete",
    interests: '["Sports", "Fitness", "Leadership", "Teamwork", "Excellence"]', // JSON string from database
    relationshipGoal: "Marriage",
    highSchool: "Madrid International School",
    collegeUniversity: "Real Madrid Academy"
  }
};

console.log('👥 USER PROFILES');
console.log('================\n');

Object.entries(realUsers).forEach(([name, user]) => {
  console.log(`📋 ${user.name.toUpperCase()} (User ${user.id}):`);
  console.log(`   Bio: "${user.bio}"`);
  console.log(`   Profession: "${user.profession}"`);
  console.log(`   Interests: ${user.interests}`);
  console.log(`   Relationship Goal: "${user.relationshipGoal}"`);
  console.log(`   High School: "${user.highSchool}"`);
  console.log(`   College/University: "${user.collegeUniversity}"`);
  console.log();
});

console.log('🔧 STEP 1: ENHANCED TEXTUAL CONTENT CREATION');
console.log('============================================\n');

// Simulate the enhanced createEnhancedTextualContent function
function createEnhancedTextualContent(user) {
  console.log(`🏗️  Processing ${user.name}'s textual content:`);
  console.log('─'.repeat(40));
  
  const contentParts = [];
  let fieldCount = 0;
  
  // Field 1: Bio (Primary biographical content)
  if (user.bio?.trim()) {
    contentParts.push(user.bio.trim());
    fieldCount++;
    console.log(`✅ Field ${fieldCount} - Bio: "${user.bio.substring(0, 60)}${user.bio.length > 60 ? '...' : ''}"`);
  }
  
  // Field 2: Profession (Professional information)
  if (user.profession?.trim()) {
    contentParts.push(user.profession.trim());
    fieldCount++;
    console.log(`✅ Field ${fieldCount} - Profession: "${user.profession}"`);
  }
  
  // Field 3: Interests (JSON parsed and joined)
  if (user.interests?.trim()) {
    try {
      const interestsArray = JSON.parse(user.interests);
      if (Array.isArray(interestsArray)) {
        const joinedInterests = interestsArray.join(' ');
        contentParts.push(joinedInterests);
        fieldCount++;
        console.log(`✅ Field ${fieldCount} - Interests (parsed): "${joinedInterests}"`);
        console.log(`   📊 JSON Array: [${interestsArray.join(', ')}] → "${joinedInterests}"`);
      }
    } catch (e) {
      contentParts.push(user.interests.trim());
      fieldCount++;
      console.log(`⚠️  Field ${fieldCount} - Interests (fallback): "${user.interests}"`);
    }
  }
  
  // Field 4: Relationship Goal (Intentions and goals)
  if (user.relationshipGoal?.trim()) {
    contentParts.push(user.relationshipGoal.trim());
    fieldCount++;
    console.log(`✅ Field ${fieldCount} - Relationship Goal: "${user.relationshipGoal}"`);
  }
  
  // Field 5: High School (Educational background)
  if (user.highSchool?.trim()) {
    contentParts.push(user.highSchool.trim());
    fieldCount++;
    console.log(`✅ Field ${fieldCount} - High School: "${user.highSchool}"`);
  }
  
  // Field 6: College/University (Higher education)
  if (user.collegeUniversity?.trim()) {
    contentParts.push(user.collegeUniversity.trim());
    fieldCount++;
    console.log(`✅ Field ${fieldCount} - College/University: "${user.collegeUniversity}"`);
  }
  
  // Combine all content with space separation and normalize
  const combinedContent = contentParts.join(' ').toLowerCase();
  
  console.log(`\n📊 CONTENT SUMMARY:`);
  console.log(`   Total Fields Used: ${fieldCount}/6`);
  console.log(`   Combined Length: ${combinedContent.length} characters`);
  console.log(`   Word Count: ${combinedContent.split(/\s+/).filter(w => w.length > 0).length} words`);
  console.log(`   Final Content: "${combinedContent.substring(0, 100)}${combinedContent.length > 100 ? '...' : ''}"`);
  console.log();
  
  return combinedContent;
}

// Process both users
const chimaContent = createEnhancedTextualContent(realUsers.chima);
const thibautContent = createEnhancedTextualContent(realUsers.thibaut);

console.log('🧮 STEP 2: TF-IDF MATHEMATICAL ANALYSIS');
console.log('=======================================\n');

// Advanced tokenization function
function tokenize(text) {
  console.log(`🔤 Tokenizing: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')     // Replace punctuation with spaces
    .split(/\s+/)                 // Split on whitespace
    .filter(token => token.length > 2); // Filter short tokens
  
  console.log(`   Raw tokens: ${tokens.length}`);
  console.log(`   Sample tokens: [${tokens.slice(0, 10).join(', ')}${tokens.length > 10 ? '...' : ''}]`);
  return tokens;
}

// Tokenize both users' content
console.log(`📝 CHIMA'S TOKENIZATION:`);
const chimaTokens = tokenize(chimaContent);

console.log(`\n📝 THIBAUT'S TOKENIZATION:`);
const thibautTokens = tokenize(thibautContent);

console.log('\n🔍 STEP 3: VOCABULARY ANALYSIS');
console.log('==============================\n');

// Create unified vocabulary
const allTokens = new Set([...chimaTokens, ...thibautTokens]);
const vocabulary = Array.from(allTokens).sort();

console.log(`📚 UNIFIED VOCABULARY:`);
console.log(`   Total unique terms: ${vocabulary.length}`);
console.log(`   Vocabulary: [${vocabulary.slice(0, 15).join(', ')}${vocabulary.length > 15 ? '...' : ''}]`);

// Find common terms
const chimaSet = new Set(chimaTokens);
const thibautSet = new Set(thibautTokens);
const commonTerms = vocabulary.filter(term => chimaSet.has(term) && thibautSet.has(term));

console.log(`\n🤝 SHARED VOCABULARY:`);
console.log(`   Common terms: ${commonTerms.length}`);
console.log(`   Shared words: [${commonTerms.join(', ')}]`);

console.log('\n📊 STEP 4: TF-IDF VECTOR CALCULATION');
console.log('====================================\n');

// Calculate Term Frequency
function calculateTF(term, tokens) {
  const termCount = tokens.filter(token => token === term).length;
  const tf = termCount / tokens.length;
  return tf;
}

// Calculate Inverse Document Frequency
function calculateIDF(term, allDocuments) {
  const documentsWithTerm = allDocuments.filter(doc => doc.includes(term)).length;
  const idf = Math.log(allDocuments.length / (1 + documentsWithTerm));
  return idf;
}

// Create TF-IDF vectors
const documents = [chimaTokens, thibautTokens];
const chimaVector = [];
const thibautVector = [];

console.log(`🧮 TF-IDF CALCULATION DETAILS:`);
console.log('─'.repeat(60));
console.log('Term'.padEnd(15) + 'Chima TF'.padEnd(12) + 'Thibaut TF'.padEnd(12) + 'IDF'.padEnd(8) + 'Chi TF-IDF'.padEnd(12) + 'Thi TF-IDF');
console.log('─'.repeat(60));

let significantTerms = [];

vocabulary.forEach(term => {
  const chimaTF = calculateTF(term, chimaTokens);
  const thibautTF = calculateTF(term, thibautTokens);
  const idf = calculateIDF(term, documents);
  
  const chimaTFIDF = chimaTF * idf;
  const thibautTFIDF = thibautTF * idf;
  
  chimaVector.push(chimaTFIDF);
  thibautVector.push(thibautTFIDF);
  
  // Show significant terms (present in at least one document)
  if (chimaTFIDF > 0 || thibautTFIDF > 0) {
    significantTerms.push({
      term,
      chimaTF: chimaTF.toFixed(4),
      thibautTF: thibautTF.toFixed(4),
      idf: idf.toFixed(4),
      chimaTFIDF: chimaTFIDF.toFixed(4),
      thibautTFIDF: thibautTFIDF.toFixed(4)
    });
  }
});

// Show top significant terms
significantTerms
  .sort((a, b) => Math.max(parseFloat(b.chimaTFIDF), parseFloat(b.thibautTFIDF)) - Math.max(parseFloat(a.chimaTFIDF), parseFloat(a.thibautTFIDF)))
  .slice(0, 10)
  .forEach(t => {
    console.log(
      t.term.padEnd(15) + 
      t.chimaTF.padEnd(12) + 
      t.thibautTF.padEnd(12) + 
      t.idf.padEnd(8) + 
      t.chimaTFIDF.padEnd(12) + 
      t.thibautTFIDF
    );
  });

console.log('\n🎯 STEP 5: COSINE SIMILARITY CALCULATION');
console.log('========================================\n');

// Calculate cosine similarity
function calculateCosineSimilarity(vector1, vector2) {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    norm1 += vector1[i] * vector1[i];
    norm2 += vector2[i] * vector2[i];
  }
  
  const magnitude1 = Math.sqrt(norm1);
  const magnitude2 = Math.sqrt(norm2);
  
  console.log(`📐 VECTOR ANALYSIS:`);
  console.log(`   Chima vector magnitude: ${magnitude1.toFixed(6)}`);
  console.log(`   Thibaut vector magnitude: ${magnitude2.toFixed(6)}`);
  console.log(`   Dot product: ${dotProduct.toFixed(6)}`);
  
  if (magnitude1 === 0 || magnitude2 === 0) {
    console.log(`   ⚠️  Zero magnitude detected - returning similarity 0`);
    return 0;
  }
  
  const cosineSimilarity = dotProduct / (magnitude1 * magnitude2);
  
  console.log(`   Cosine similarity: ${dotProduct.toFixed(6)} ÷ (${magnitude1.toFixed(6)} × ${magnitude2.toFixed(6)})`);
  console.log(`   Final similarity: ${cosineSimilarity.toFixed(6)}`);
  
  return cosineSimilarity;
}

const similarity = calculateCosineSimilarity(chimaVector, thibautVector);

console.log('\n🏆 FINAL RESULTS');
console.log('================\n');

console.log(`👤 CHIMA (User 11):`);
console.log(`   Content: ${chimaContent.length} characters, ${chimaTokens.length} tokens`);
console.log(`   Fields: Bio + Profession + Interests + RelationshipGoal + HighSchool + University`);

console.log(`\n👤 THIBAUT (User 2):`);
console.log(`   Content: ${thibautContent.length} characters, ${thibautTokens.length} tokens`);
console.log(`   Fields: Bio + Profession + Interests + RelationshipGoal + HighSchool + Academy`);

console.log(`\n🎯 TF-IDF SIMILARITY SCORE: ${similarity.toFixed(4)}`);

if (similarity > 0.7) {
  console.log(`   🟢 HIGH COMPATIBILITY - Strong textual alignment`);
} else if (similarity > 0.4) {
  console.log(`   🟡 MEDIUM COMPATIBILITY - Moderate textual similarity`);
} else {
  console.log(`   🔴 LOW COMPATIBILITY - Limited textual overlap`);
}

console.log(`\n📈 ALGORITHM IMPROVEMENTS:`);
console.log(`   ✅ 6 textual fields vs 3 previously (+100% field coverage)`);
console.log(`   ✅ JSON interest parsing vs raw string (+accuracy)`);
console.log(`   ✅ Education background inclusion (+depth)`);
console.log(`   ✅ Relationship goal analysis (+intentionality)`);
console.log(`   ✅ Enhanced tokenization and processing (+precision)`);

console.log(`\n🚀 This TF-IDF analysis provides the textual similarity component`);
console.log(`   for CHARLEY's hybrid matching engine (20% algorithm weight)`);
console.log(`   combined with Jaccard similarity, Cosine similarity, and`);
console.log(`   preference alignment for comprehensive content-based filtering.`);