import connectDB from '@/lib/mongodb.js';
import { User } from '@/models/User.js';
import { getFacebookPerformanceMetrics, verifyMetaToken } from '@/utils/meta.js';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
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
    
    // Get performance metrics
    console.log('📊 Requesting performance metrics with params:', {
      pageId,
      startDate,
      endDate,
      hasToken: !!pageAccessToken
    });
    
    const performance = await getFacebookPerformanceMetrics(
      pageAccessToken,
      pageId,
      startDate,
      endDate
    );
    
    console.log('✅ Performance data received:', JSON.stringify(performance, null, 2));
    
    return Response.json({
      success: true,
      performance
    });
    
  } catch (error) {
    console.error('Facebook performance API error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return Response.json(
      { error: error.message || 'Failed to fetch Facebook performance metrics' },
      { status: 500 }
    );
  }
}
