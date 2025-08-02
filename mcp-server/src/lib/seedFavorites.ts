// src/lib/seedFavorites.ts
import redisClient from './redis';

const STREAM_KEY = 'favorites_activity';

export async function seedFavoritesData() {
  try {
    // Check if stream already has data
    const streamLength = await redisClient.xLen(STREAM_KEY);
    
    if (streamLength > 0) {
      console.log('🔄 Favorites stream already has data, skipping seed');
      return;
    }

    console.log('🌱 Seeding initial favorites data...');

    // Create sample data spanning the last 7 days
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    const sampleUsers = ['demo-user-1', 'demo-user-2', 'demo-user-3', 'demo-user-4'];
    const sampleJobs = ['job001', 'job002', 'job003', 'job004', 'job005', 'job006'];
    
    let totalFavorites = 0;
    
    // Generate activity over the past week
    for (let day = 6; day >= 0; day--) {
      const dayTimestamp = now - (day * dayMs);
      
      // Generate 3-8 activities per day
      const activitiesPerDay = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < activitiesPerDay; i++) {
        const user = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
        const job = sampleJobs[Math.floor(Math.random() * sampleJobs.length)];
        const action = Math.random() > 0.2 ? 1 : -1; // 80% favorites, 20% unfavorites
        
        if (action === 1) totalFavorites++;
        else totalFavorites = Math.max(0, totalFavorites - 1);
        
        // Spread activities throughout the day
        const timestamp = dayTimestamp + Math.floor(Math.random() * dayMs);
        
        await redisClient.xAdd(STREAM_KEY, '*', {
          user,
          job,
          act: action.toString(),
          total: totalFavorites.toString(),
          ts: timestamp.toString()
        });
      }
    }
    
    console.log(`✅ Seeded ${await redisClient.xLen(STREAM_KEY)} favorites activities`);
    
  } catch (error) {
    console.error('❌ Failed to seed favorites data:', error);
  }
}