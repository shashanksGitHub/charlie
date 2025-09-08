/**
 * Script to restore the global interests from a backup
 * 
 * This script will:
 * 1. Create a global_interests table if it doesn't exist
 * 2. Insert all 102 global interests from the backup
 */
import pg from 'pg';

const { Pool } = pg;

// Use the environment variables directly
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// The list of interests extracted from meet_database_dump.sql
const interests = [
  { id: 1, interest: 'Traditional Festivals', category: 'Culture & Traditions', created_at: '2025-04-21 04:42:33.728' },
  { id: 2, interest: 'Kente Weaving', category: 'Culture & Traditions', created_at: '2025-04-21 04:42:33.867' },
  { id: 3, interest: 'Cultural Heritage', category: 'Culture & Traditions', created_at: '2025-04-21 04:42:33.933' },
  { id: 4, interest: 'Tribal History', category: 'Culture & Traditions', created_at: '2025-04-21 04:42:34' },
  { id: 5, interest: 'Traditional Marriage', category: 'Culture & Traditions', created_at: '2025-04-21 04:42:34.066' },
  { id: 6, interest: 'Naming Ceremonies', category: 'Culture & Traditions', created_at: '2025-04-21 04:42:34.132' },
  { id: 7, interest: 'Puberty Rites', category: 'Culture & Traditions', created_at: '2025-04-21 04:42:34.197' },
  { id: 8, interest: 'Traditional Storytelling', category: 'Culture & Traditions', created_at: '2025-04-21 04:42:34.263' },
  { id: 9, interest: 'Adinkra Symbols', category: 'Culture & Traditions', created_at: '2025-04-21 04:42:34.329' },
  { id: 10, interest: 'Traditional Governance', category: 'Culture & Traditions', created_at: '2025-04-21 04:42:34.394' },
  { id: 11, interest: 'Gospel Music', category: 'Music & Dance', created_at: '2025-04-21 04:42:34.46' },
  { id: 12, interest: 'Afrobeats', category: 'Music & Dance', created_at: '2025-04-21 04:42:34.525' },
  { id: 13, interest: 'Traditional Drumming', category: 'Music & Dance', created_at: '2025-04-21 04:42:34.59' },
  { id: 14, interest: 'Adowa Dance', category: 'Music & Dance', created_at: '2025-04-21 04:42:34.656' },
  { id: 15, interest: 'Highlife Music', category: 'Music & Dance', created_at: '2025-04-21 04:42:34.721' },
  { id: 16, interest: 'Hiplife', category: 'Music & Dance', created_at: '2025-04-21 04:42:34.787' },
  { id: 17, interest: 'Azonto Dance', category: 'Music & Dance', created_at: '2025-04-21 04:42:34.852' },
  { id: 18, interest: 'Palm Wine Music', category: 'Music & Dance', created_at: '2025-04-21 04:42:34.917' },
  { id: 19, interest: 'Borborbor Dance', category: 'Music & Dance', created_at: '2025-04-21 04:42:34.981' },
  { id: 20, interest: 'Kpanlogo Dance', category: 'Music & Dance', created_at: '2025-04-21 04:42:35.046' },
  { id: 21, interest: 'Local Cuisine', category: 'Food & Cuisine', created_at: '2025-04-21 04:42:35.111' },
  { id: 22, interest: 'Bush Meat', category: 'Food & Cuisine', created_at: '2025-04-21 04:42:35.176' },
  { id: 23, interest: 'Jollof Rice', category: 'Food & Cuisine', created_at: '2025-04-21 04:42:35.241' },
  { id: 24, interest: 'Kontomire Stew', category: 'Food & Cuisine', created_at: '2025-04-21 04:42:35.306' },
  { id: 25, interest: 'Fufu & Soup', category: 'Food & Cuisine', created_at: '2025-04-21 04:42:35.37' },
  { id: 26, interest: 'Red Red (Beans)', category: 'Food & Cuisine', created_at: '2025-04-21 04:42:35.435' },
  { id: 27, interest: 'Waakye', category: 'Food & Cuisine', created_at: '2025-04-21 04:42:35.5' },
  { id: 28, interest: 'Banku & Tilapia', category: 'Food & Cuisine', created_at: '2025-04-21 04:42:35.564' },
  { id: 29, interest: 'Kelewele', category: 'Food & Cuisine', created_at: '2025-04-21 04:42:35.628' },
  { id: 30, interest: 'Palm Nut Soup', category: 'Food & Cuisine', created_at: '2025-04-21 04:42:35.692' },
  { id: 31, interest: 'Bible Study', category: 'Faith & Spirituality', created_at: '2025-04-21 04:42:35.756' },
  { id: 32, interest: 'Prayer Groups', category: 'Faith & Spirituality', created_at: '2025-04-21 04:42:35.82' },
  { id: 33, interest: 'Church Activities', category: 'Faith & Spirituality', created_at: '2025-04-21 04:42:35.883' },
  { id: 34, interest: 'Worship Services', category: 'Faith & Spirituality', created_at: '2025-04-21 04:42:35.947' },
  { id: 35, interest: 'Christian Dating', category: 'Faith & Spirituality', created_at: '2025-04-21 04:42:36.011' },
  { id: 36, interest: 'Faith-Based Charity', category: 'Faith & Spirituality', created_at: '2025-04-21 04:42:36.075' },
  { id: 37, interest: 'Spiritual Growth', category: 'Faith & Spirituality', created_at: '2025-04-21 04:42:36.139' },
  { id: 38, interest: 'Christian Marriage', category: 'Faith & Spirituality', created_at: '2025-04-21 04:42:36.202' },
  { id: 39, interest: 'Gospel Preaching', category: 'Faith & Spirituality', created_at: '2025-04-21 04:42:36.266' },
  { id: 40, interest: 'Religious Festivals', category: 'Faith & Spirituality', created_at: '2025-04-21 04:42:36.329' },
  { id: 41, interest: 'Football', category: 'Sports & Recreation', created_at: '2025-04-21 04:42:36.393' },
  { id: 42, interest: 'Basketball', category: 'Sports & Recreation', created_at: '2025-04-21 04:42:36.456' },
  { id: 43, interest: 'Running', category: 'Sports & Recreation', created_at: '2025-04-21 04:42:36.52' },
  { id: 44, interest: 'Volleyball', category: 'Sports & Recreation', created_at: '2025-04-21 04:42:36.584' },
  { id: 45, interest: 'Table Tennis', category: 'Sports & Recreation', created_at: '2025-04-21 04:42:36.647' },
  { id: 46, interest: 'Swimming', category: 'Sports & Recreation', created_at: '2025-04-21 04:42:36.711' },
  { id: 47, interest: 'Boxing', category: 'Sports & Recreation', created_at: '2025-04-21 04:42:36.774' },
  { id: 48, interest: 'Hiking', category: 'Sports & Recreation', created_at: '2025-04-21 04:42:36.838' },
  { id: 49, interest: 'Fishing', category: 'Sports & Recreation', created_at: '2025-04-21 04:42:36.902' },
  { id: 50, interest: 'Yoga', category: 'Sports & Recreation', created_at: '2025-04-21 04:42:36.965' },
  { id: 51, interest: 'Teaching', category: 'Education & Career', created_at: '2025-04-21 04:42:37.028' },
  { id: 52, interest: 'Technology', category: 'Education & Career', created_at: '2025-04-21 04:42:37.092' },
  { id: 53, interest: 'Medicine', category: 'Education & Career', created_at: '2025-04-21 04:42:37.156' },
  { id: 54, interest: 'Engineering', category: 'Education & Career', created_at: '2025-04-21 04:42:37.219' },
  { id: 55, interest: 'Business', category: 'Education & Career', created_at: '2025-04-21 04:42:37.283' },
  { id: 56, interest: 'Agriculture', category: 'Education & Career', created_at: '2025-04-21 04:42:37.346' },
  { id: 57, interest: 'Law', category: 'Education & Career', created_at: '2025-04-21 04:42:37.409' },
  { id: 58, interest: 'Arts & Design', category: 'Education & Career', created_at: '2025-04-21 04:42:37.473' },
  { id: 59, interest: 'Public Service', category: 'Education & Career', created_at: '2025-04-21 04:42:37.536' },
  { id: 60, interest: 'International Relations', category: 'Education & Career', created_at: '2025-04-21 04:42:37.599' },
  { id: 61, interest: 'Nollywood Movies', category: 'Entertainment', created_at: '2025-04-21 04:42:37.662' },
  { id: 62, interest: 'Ghanaian Movies', category: 'Entertainment', created_at: '2025-04-21 04:42:37.725' },
  { id: 63, interest: 'Comedy Shows', category: 'Entertainment', created_at: '2025-04-21 04:42:37.789' },
  { id: 64, interest: 'Reality TV', category: 'Entertainment', created_at: '2025-04-21 04:42:37.852' },
  { id: 65, interest: 'Live Concerts', category: 'Entertainment', created_at: '2025-04-21 04:42:37.915' },
  { id: 66, interest: 'Stage Plays', category: 'Entertainment', created_at: '2025-04-21 04:42:37.979' },
  { id: 67, interest: 'Cultural Festivals', category: 'Entertainment', created_at: '2025-04-21 04:42:38.042' },
  { id: 68, interest: 'Movie Nights', category: 'Entertainment', created_at: '2025-04-21 04:42:38.105' },
  { id: 69, interest: 'Podcasts', category: 'Entertainment', created_at: '2025-04-21 04:42:38.168' },
  { id: 70, interest: 'Board Games', category: 'Entertainment', created_at: '2025-04-21 04:42:38.232' },
  { id: 71, interest: 'Photography', category: 'Arts & Creativity', created_at: '2025-04-21 04:42:38.295' },
  { id: 72, interest: 'Painting', category: 'Arts & Creativity', created_at: '2025-04-21 04:42:38.358' },
  { id: 73, interest: 'Sculpting', category: 'Arts & Creativity', created_at: '2025-04-21 04:42:38.421' },
  { id: 74, interest: 'Poetry', category: 'Arts & Creativity', created_at: '2025-04-21 04:42:38.484' },
  { id: 75, interest: 'Creative Writing', category: 'Arts & Creativity', created_at: '2025-04-21 04:42:38.547' },
  { id: 76, interest: 'Traditional Crafts', category: 'Arts & Creativity', created_at: '2025-04-21 04:42:38.61' },
  { id: 77, interest: 'Fashion Design', category: 'Arts & Creativity', created_at: '2025-04-21 04:42:38.672' },
  { id: 78, interest: 'Beadwork', category: 'Arts & Creativity', created_at: '2025-04-21 04:42:38.735' },
  { id: 79, interest: 'Music Composition', category: 'Arts & Creativity', created_at: '2025-04-21 04:42:38.798' },
  { id: 80, interest: 'Graphic Design', category: 'Arts & Creativity', created_at: '2025-04-21 04:42:38.86' },
  { id: 81, interest: 'Family Values', category: 'Values & Lifestyle', created_at: '2025-04-21 04:42:38.923' },
  { id: 82, interest: 'Community Service', category: 'Values & Lifestyle', created_at: '2025-04-21 04:42:38.986' },
  { id: 83, interest: 'Clean Living', category: 'Values & Lifestyle', created_at: '2025-04-21 04:42:39.048' },
  { id: 84, interest: 'Financial Discipline', category: 'Values & Lifestyle', created_at: '2025-04-21 04:42:39.111' },
  { id: 85, interest: 'Respect for Elders', category: 'Values & Lifestyle', created_at: '2025-04-21 04:42:39.173' },
  { id: 86, interest: 'Charitable Giving', category: 'Values & Lifestyle', created_at: '2025-04-21 04:42:39.236' },
  { id: 87, interest: 'Traditional Education', category: 'Values & Lifestyle', created_at: '2025-04-21 04:42:39.298' },
  { id: 88, interest: 'Environmental Care', category: 'Values & Lifestyle', created_at: '2025-04-21 04:42:39.361' },
  { id: 89, interest: 'Modest Living', category: 'Values & Lifestyle', created_at: '2025-04-21 04:42:39.424' },
  { id: 90, interest: 'Work Ethics', category: 'Values & Lifestyle', created_at: '2025-04-21 04:42:39.486' },
  { id: 91, interest: 'Beaches', category: 'Travel & Adventure', created_at: '2025-04-21 04:42:39.549' },
  { id: 92, interest: 'Historical Sites', category: 'Travel & Adventure', created_at: '2025-04-21 04:42:39.611' },
  { id: 93, interest: 'National Parks', category: 'Travel & Adventure', created_at: '2025-04-21 04:42:39.674' },
  { id: 94, interest: 'Wildlife Safari', category: 'Travel & Adventure', created_at: '2025-04-21 04:42:39.736' },
  { id: 95, interest: 'Road Trips', category: 'Travel & Adventure', created_at: '2025-04-21 04:42:39.799' },
  { id: 96, interest: 'Camping', category: 'Travel & Adventure', created_at: '2025-04-21 04:42:39.861' },
  { id: 97, interest: 'Mountain Climbing', category: 'Travel & Adventure', created_at: '2025-04-21 04:42:39.924' },
  { id: 98, interest: 'Cultural Tourism', category: 'Travel & Adventure', created_at: '2025-04-21 04:42:39.986' },
  { id: 99, interest: 'Local Festivals', category: 'Travel & Adventure', created_at: '2025-04-21 04:42:40.049' },
  { id: 100, interest: 'Eco Tourism', category: 'Travel & Adventure', created_at: '2025-04-21 04:42:40.111' },
  { id: 101, interest: 'Literature', category: 'Other', created_at: '2025-04-21 04:42:40.173' },
  { id: 102, interest: 'Tech', category: 'Other', created_at: '2025-04-21 04:42:40.236' }
];

async function restoreGlobalInterests() {
  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');

    console.log('Checking if global_interests table exists...');
    
    // Check if the sequence exists
    const sequenceCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.sequences 
        WHERE sequence_name = 'global_interests_id_seq'
      );
    `);

    // Create table if it doesn't exist
    if (!sequenceCheck.rows[0].exists) {
      console.log('Creating global_interests table and sequence...');
      await client.query(`
        CREATE SEQUENCE global_interests_id_seq;
        
        CREATE TABLE global_interests (
          id INTEGER PRIMARY KEY DEFAULT nextval('global_interests_id_seq'),
          interest TEXT NOT NULL,
          category TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER
        );
      `);
    }

    console.log(`Inserting ${interests.length} global interests...`);
    
    // Insert all interests
    for (const interest of interests) {
      await client.query(
        `INSERT INTO global_interests (id, interest, category, created_at, created_by) 
         VALUES ($1, $2, $3, $4, NULL)
         ON CONFLICT (id) DO UPDATE 
         SET interest = $2, category = $3, created_at = $4`,
        [interest.id, interest.interest, interest.category, interest.created_at]
      );
    }

    // Update the sequence to continue after the highest ID
    await client.query(`SELECT setval('global_interests_id_seq', 102, true);`);

    // Commit the transaction
    await client.query('COMMIT');
    console.log('Successfully restored all 102 global interests!');
    
  } catch (error) {
    // If anything goes wrong, roll back the changes
    await client.query('ROLLBACK');
    console.error('ERROR: Transaction failed and was rolled back.');
    console.error(error);
  } finally {
    // Always release the client back to the pool
    client.release();
    pool.end();
  }
}

// Run the function
restoreGlobalInterests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});