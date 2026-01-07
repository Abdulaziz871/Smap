import connectDB from '@/lib/mongodb.js';
import { User } from '@/models/User.js';

export async function POST(request) {
  try {
    await connectDB();
    
    const { userId } = await request.json();
    
    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Clear cached analytics for both YouTube and Facebook
    await User.findByIdAndUpdate(userId, {
      $unset: {
        'youtubeData.latestAnalytics': '',
        'youtubeData.lastAnalyticsUpdate': '',
        'facebookData.latestAnalytics': '',
        'facebookData.lastAnalyticsUpdate': ''
      }
    });
    
    console.log('✅ Cleared cached analytics for user:', userId);
    
    return Response.json({
      success: true,
      message: 'Analytics cache cleared successfully'
    });
    
  } catch (error) {
    console.error('Error clearing cache:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
