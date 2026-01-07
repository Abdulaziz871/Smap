import connectDB from '@/lib/mongodb.js';
import { User } from '@/models/User.js';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get Facebook data from user
    const user = await User.findById(userId).select('facebookData');

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.facebookData || !user.facebookData.isConnected) {
      return Response.json(
        { isConnected: false, message: 'Facebook not connected' },
        { status: 200 }
      );
    }

    return Response.json({
      isConnected: true,
      facebookData: {
        pageId: user.facebookData.pageId,
        pageName: user.facebookData.pageName,
        fanCount: user.facebookData.fanCount,
        talkingAboutCount: user.facebookData.talkingAboutCount,
        category: user.facebookData.category,
        lastSynced: user.facebookData.lastSynced
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching Facebook data:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
