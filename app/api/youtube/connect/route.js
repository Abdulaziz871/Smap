import { getYouTubeAuthUrl } from '../../../../utils/youtube.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Generate state parameter to include user ID
    const state = JSON.stringify({ userId });
    
    // Get YouTube OAuth URL
    const authUrl = getYouTubeAuthUrl(state);
    
    return Response.json({
      authUrl,
      message: 'YouTube authorization URL generated successfully'
    });
    
  } catch (error) {
    console.error('YouTube connect error:', error);
    return Response.json(
      { error: 'Failed to generate YouTube authorization URL' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Generate state parameter to include user ID
    const state = JSON.stringify({ userId });
    
    // Get YouTube OAuth URL
    const authUrl = getYouTubeAuthUrl(state);
    
    // Return redirect response
    return Response.redirect(authUrl);
    
  } catch (error) {
    console.error('YouTube connect error:', error);
    return Response.json(
      { error: 'Failed to initiate YouTube connection' },
      { status: 500 }
    );
  }
}
