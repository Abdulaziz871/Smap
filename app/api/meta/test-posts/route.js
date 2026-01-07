import connectDB from '@/lib/mongodb.js';
import { User } from '@/models/User.js';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const user = await User.findById(userId);
    
    if (!user || !user.facebookData || !user.facebookData.isConnected) {
      return Response.json({ error: 'Facebook not connected' }, { status: 400 });
    }
    
    const pageAccessToken = user.facebookData.pageAccessToken;
    const pageId = user.facebookData.pageId;
    
    // Test direct API call to Facebook
    const testUrl = `https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,message,story,created_time,type&limit=10&access_token=${pageAccessToken}`;
    
    console.log('🔍 Testing Facebook Posts API...');
    console.log('Page ID:', pageId);
    console.log('URL:', testUrl.replace(pageAccessToken, 'TOKEN_HIDDEN'));
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    console.log('📊 Facebook API Response:', JSON.stringify(data, null, 2));
    
    return Response.json({
      success: response.ok,
      status: response.status,
      data: data,
      pageId: pageId,
      postsCount: data.data?.length || 0
    });
    
  } catch (error) {
    console.error('Test posts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
