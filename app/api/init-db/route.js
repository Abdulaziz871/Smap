import { initializeSocialMediaTypes } from '../../../utils/database.js';
import { seedDatabase } from '../../../scripts/seed.js';

export async function POST(request) {
  try {
    // Initialize social media types first
    await initializeSocialMediaTypes();
    
    // Then seed the database with sample data
    await seedDatabase();
    
    return Response.json(
      { 
        message: 'Database initialized successfully with sample data',
        testUser: {
          email: 'test@smap.com',
          password: 'password123'
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error initializing database:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
