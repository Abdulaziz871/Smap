import connectDB from '@/lib/mongodb.js';
import { User } from '@/models/User.js';
import { getFacebookDemographics, verifyMetaToken } from '@/utils/meta.js';

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
    
    // Get user with Facebook data
    const user = await User.findById(userId);
    
    if (!user || !user.facebookData || !user.facebookData.isConnected) {
      return Response.json(
        { error: 'Facebook page not connected' },
        { status: 400 }
      );
    }
    
    const pageAccessToken = user.facebookData.pageAccessToken;
    const pageId = user.facebookData.pageId;
    
    // Verify if current token is still valid
    const isTokenValid = await verifyMetaToken(pageAccessToken);
    
    if (!isTokenValid) {
      return Response.json(
        { error: 'Facebook token expired. Please reconnect your account.' },
        { status: 401 }
      );
    }
    
    // Get demographics data
    const demographics = await getFacebookDemographics(
      pageAccessToken,
      pageId
    );
    
    return Response.json({
      success: true,
      demographics
    });
    
  } catch (error) {
    console.error('Facebook demographics API error:', error);
    return Response.json(
      { error: 'Failed to fetch Facebook demographics data' },
      { status: 500 }
    );
  }
}
