import connectDB from '@/lib/mongodb.js';
import { User } from '@/models/User.js';
import { getMetaAuthUrl } from '@/utils/meta.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const platform = searchParams.get('platform') || 'instagram'; // instagram or facebook
    
    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if Meta credentials are configured
    const metaClientId = process.env.META_CLIENT_ID;
    const metaClientSecret = process.env.META_CLIENT_SECRET;
    
    if (!metaClientId || !metaClientSecret || 
        metaClientId === 'your-meta-app-id' || 
        metaClientSecret === 'your-meta-app-secret' ||
        metaClientSecret === 'your_actual_app_secret_here') {
      
      // For development - create a demo connection
      if (metaClientId === '1530572184783383' && metaClientSecret === 'your_actual_app_secret_here') {
        return Response.json({
          success: true,
          demoMode: true,
          message: `Demo ${platform} connection created. Please complete Meta app setup for real connection.`,
          platform
        });
      }
      
      return Response.json(
        { 
          error: 'Meta app credentials not configured', 
          message: `${platform} connection requires valid Meta app credentials. Please configure META_CLIENT_ID and META_CLIENT_SECRET in your environment variables.`,
          needsSetup: true
        },
        { status: 400 }
      );
    }
    
    // Generate Meta OAuth URL
    const authUrl = getMetaAuthUrl(platform, userId);
    
    return Response.json({
      success: true,
      authUrl,
      platform
    });
    
  } catch (error) {
    console.error('Meta connect error:', error);
    return Response.json(
      { error: 'Failed to generate Meta OAuth URL' },
      { status: 500 }
    );
  }
}