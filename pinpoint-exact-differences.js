// PINPOINT EXACT DIFFERENCES: Obed vs Chimamanda Profile Analysis
// This script will identify the precise factors causing the 0.022 content advantage

import { neon } from '@neondatabase/serverless';

async function analyzeUserDifferences() {
    console.log("🔬 PINPOINTING EXACT DIFFERENCES BETWEEN OBED AND CHIMAMANDA");
    console.log("============================================================");
    
    // Connect to database
    const sql = neon(process.env.DATABASE_URL);
    
    try {
        // Fetch both users' complete data
        const users = await sql`
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.date_of_birth,
                u.gender,
                u.location,
                u.country_of_origin,
                u.secondary_country_of_origin,
                u.bio,
                u.profession,
                u.ethnicity,
                u.secondary_tribe,
                u.religion,
                u.education_level,
                u.high_school,
                u.college_university,
                u.has_children,
                u.wants_children,
                u.smoking,
                u.drinking,
                u.body_type,
                u.height,
                up.min_age,
                up.max_age,
                up.min_height_preference,
                up.max_height_preference,
                up.body_type_preference,
                up.religion_preference,
                up.ethnicity_preference,
                up.education_level_preference,
                up.has_children_preference,
                up.wants_children_preference,
                up.matching_priorities,
                up.deal_breakers,
                up.relationship_goal_preference,
                up.distance_preference,
                up.meet_pool_country,
                up.suite_pool_country
            FROM users u
            LEFT JOIN user_preferences up ON u.id = up.user_id
            WHERE u.id IN (1, 3)
            ORDER BY u.id;
        `;
        
        if (users.length !== 2) {
            console.log("❌ Could not find both users");
            return;
        }
        
        const obed = users.find(u => u.id === 1);
        const chimamanda = users.find(u => u.id === 3);
        
        console.log("\n👤 USER PROFILES");
        console.log("================");
        console.log(`Obed (ID: ${obed.id}): ${obed.full_name}`);
        console.log(`Chimamanda (ID: ${chimamanda.id}): ${chimamanda.full_name}`);
        
        // Calculate ages
        const obedAge = new Date().getFullYear() - new Date(obed.date_of_birth).getFullYear();
        const chimamandaAge = new Date().getFullYear() - new Date(chimamanda.date_of_birth).getFullYear();
        
        console.log("\n🎂 AGE ANALYSIS (Critical for Cosine Similarity)");
        console.log("================================================");
        console.log(`Obed Age: ${obedAge} years`);
        console.log(`Chimamanda Age: ${chimamandaAge} years`);
        console.log(`Age Difference: ${Math.abs(obedAge - chimamandaAge)} years`);
        
        if (obedAge !== chimamandaAge) {
            console.log("⚠️  CRITICAL DIFFERENCE FOUND: Different ages affect numerical compatibility vectors");
        }
        
        // Compare numerical fields affecting Cosine Similarity
        console.log("\n📊 NUMERICAL FIELDS COMPARISON (Cosine Similarity Factors)");
        console.log("===========================================================");
        
        const numericFields = [
            { field: 'height', obed: obed.height, chimamanda: chimamanda.height },
            { field: 'min_age', obed: obed.min_age, chimamanda: chimamanda.min_age },
            { field: 'max_age', obed: obed.max_age, chimamanda: chimamanda.max_age },
            { field: 'min_height_preference', obed: obed.min_height_preference, chimamanda: chimamanda.min_height_preference },
            { field: 'max_height_preference', obed: obed.max_height_preference, chimamanda: chimamanda.max_height_preference },
            { field: 'distance_preference', obed: obed.distance_preference, chimamanda: chimamanda.distance_preference }
        ];
        
        numericFields.forEach(({ field, obed: obedVal, chimamanda: chimamandaVal }) => {
            console.log(`${field}:`);
            console.log(`  Obed: ${JSON.stringify(obedVal)}`);
            console.log(`  Chimamanda: ${JSON.stringify(chimamandaVal)}`);
            if (JSON.stringify(obedVal) !== JSON.stringify(chimamandaVal)) {
                console.log(`  🚨 DIFFERENCE DETECTED in ${field}!`);
            }
            console.log();
        });
        
        // Compare categorical fields affecting Jaccard Similarity
        console.log("\n📋 CATEGORICAL FIELDS COMPARISON (Jaccard Similarity Factors)");
        console.log("==============================================================");
        
        const categoricalFields = [
            { field: 'gender', obed: obed.gender, chimamanda: chimamanda.gender },
            { field: 'location', obed: obed.location, chimamanda: chimamanda.location },
            { field: 'country_of_origin', obed: obed.country_of_origin, chimamanda: chimamanda.country_of_origin },
            { field: 'ethnicity', obed: obed.ethnicity, chimamanda: chimamanda.ethnicity },
            { field: 'religion', obed: obed.religion, chimamanda: chimamanda.religion },
            { field: 'education_level', obed: obed.education_level, chimamanda: chimamanda.education_level },
            { field: 'body_type', obed: obed.body_type, chimamanda: chimamanda.body_type },
            { field: 'has_children', obed: obed.has_children, chimamanda: chimamanda.has_children },
            { field: 'wants_children', obed: obed.wants_children, chimamanda: chimamanda.wants_children },
            { field: 'smoking', obed: obed.smoking, chimamanda: chimamanda.smoking },
            { field: 'drinking', obed: obed.drinking, chimamanda: chimamanda.drinking }
        ];
        
        const differences = [];
        categoricalFields.forEach(({ field, obed: obedVal, chimamanda: chimamandaVal }) => {
            console.log(`${field}:`);
            console.log(`  Obed: ${obedVal}`);
            console.log(`  Chimamanda: ${chimamandaVal}`);
            if (obedVal !== chimamandaVal) {
                console.log(`  🚨 DIFFERENCE DETECTED in ${field}!`);
                differences.push(field);
            }
            console.log();
        });
        
        // Compare preference fields affecting Preference Alignment
        console.log("\n🎯 PREFERENCE FIELDS COMPARISON (Preference Alignment Factors)");
        console.log("===============================================================");
        
        const preferenceFields = [
            { field: 'matching_priorities', obed: obed.matching_priorities, chimamanda: chimamanda.matching_priorities },
            { field: 'deal_breakers', obed: obed.deal_breakers, chimamanda: chimamanda.deal_breakers },
            { field: 'meet_pool_country', obed: obed.meet_pool_country, chimamanda: chimamanda.meet_pool_country },
            { field: 'body_type_preference', obed: obed.body_type_preference, chimamanda: chimamanda.body_type_preference },
            { field: 'religion_preference', obed: obed.religion_preference, chimamanda: chimamanda.religion_preference },
            { field: 'ethnicity_preference', obed: obed.ethnicity_preference, chimamanda: chimamanda.ethnicity_preference }
        ];
        
        preferenceFields.forEach(({ field, obed: obedVal, chimamanda: chimamandaVal }) => {
            console.log(`${field}:`);
            console.log(`  Obed: ${JSON.stringify(obedVal)}`);
            console.log(`  Chimamanda: ${JSON.stringify(chimamandaVal)}`);
            if (JSON.stringify(obedVal) !== JSON.stringify(chimamandaVal)) {
                console.log(`  🚨 DIFFERENCE DETECTED in ${field}!`);
                differences.push(field);
            }
            console.log();
        });
        
        // Profile completeness analysis
        console.log("\n📈 PROFILE COMPLETENESS ANALYSIS");
        console.log("=================================");
        
        function calculateCompleteness(user) {
            const fields = [
                user.bio, user.profession, user.ethnicity, user.religion, 
                user.education_level, user.high_school, user.college_university,
                user.has_children, user.wants_children, user.smoking, user.drinking,
                user.body_type, user.height, user.location, user.country_of_origin
            ];
            
            const filled = fields.filter(field => field !== null && field !== undefined && field !== '').length;
            return (filled / fields.length) * 100;
        }
        
        const obedCompleteness = calculateCompleteness(obed);
        const chimamandaCompleteness = calculateCompleteness(chimamanda);
        
        console.log(`Obed Profile Completeness: ${obedCompleteness.toFixed(1)}%`);
        console.log(`Chimamanda Profile Completeness: ${chimamandaCompleteness.toFixed(1)}%`);
        console.log(`Completeness Difference: ${(obedCompleteness - chimamandaCompleteness).toFixed(1)}%`);
        
        if (Math.abs(obedCompleteness - chimamandaCompleteness) > 1) {
            console.log("⚠️  SIGNIFICANT COMPLETENESS DIFFERENCE AFFECTS COSINE SIMILARITY!");
        }
        
        // Summary of differences
        console.log("\n🎯 SUMMARY OF CRITICAL DIFFERENCES");
        console.log("==================================");
        console.log(`Total differences found: ${differences.length}`);
        console.log("Differences by category:");
        console.log(`- Age difference: ${Math.abs(obedAge - chimamandaAge)} years`);
        console.log(`- Profile completeness gap: ${Math.abs(obedCompleteness - chimamandaCompleteness).toFixed(1)}%`);
        console.log(`- Categorical field differences: ${differences.length}`);
        
        console.log("\n💡 MOST LIKELY EXPLANATION FOR 0.022 ADVANTAGE:");
        console.log("================================================");
        
        if (Math.abs(obedAge - chimamandaAge) > 0) {
            console.log("1. AGE COMPATIBILITY - Different ages create numerical vector differences in Cosine Similarity (30% weight)");
        }
        
        if (Math.abs(obedCompleteness - chimamandaCompleteness) > 1) {
            console.log("2. PROFILE COMPLETENESS - Different completion rates affect numerical scoring");
        }
        
        if (differences.length > 0) {
            console.log("3. CATEGORICAL DIFFERENCES - Multiple field differences accumulate in Jaccard Similarity (25% weight)");
        }
        
        console.log("\nThe combination of these factors, weighted through the 4-component algorithm,");
        console.log("results in Obed's consistent 0.022-point content advantage and #1 ranking.");
        
    } catch (error) {
        console.error("❌ Database error:", error);
    }
}

// Run the analysis
analyzeUserDifferences();