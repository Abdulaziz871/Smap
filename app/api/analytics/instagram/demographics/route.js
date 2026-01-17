import connectDB from '@/lib/mongodb.js';
import { User } from '@/models/User.js';
import { getInstagramDemographics, verifyMetaToken } from '@/utils/meta.js';

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
    
    // Get user with Instagram data
    const user = await User.findById(userId);
    
    if (!user || !user.instagramData || !user.instagramData.isConnected) {
      return Response.json(
        { error: 'Instagram account not connected' },
        { status: 400 }
      );
    }
    
    const accessToken = user.instagramData.accessToken;
    const instagramAccountId = user.instagramData.instagramAccountId;
    
    // Verify if current token is still valid
    const isTokenValid = await verifyMetaToken(accessToken);
    
    if (!isTokenValid) {
      return Response.json(
        { error: 'Instagram token expired. Please reconnect your account.' },
        { status: 401 }
      );
    }
    
    // Get demographics data
    const demographics = await getInstagramDemographics(
      accessToken,
      instagramAccountId
    );
    
    return Response.json({
      success: true,
      demographics
    });
    
  } catch (error) {
    console.error('Instagram demographics API error:', error);
    return Response.json(
      { error: 'Failed to fetch Instagram demographics data' },
      { status: 500 }
    );
  }
}
