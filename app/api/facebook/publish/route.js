import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '../../../../lib/mongodb.js';
import { User } from '../../../../models/User.js';
import ScheduledPost from '../../../../models/ScheduledPost';

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    return null;
  }
}

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';

/**
 * Publish a post to Facebook Page
 */
async function publishToFacebookPage(pageId, pageAccessToken, content) {
  const { message, link, mediaUrls, mediaType } = content;
  
  let endpoint = `${FACEBOOK_GRAPH_API}/${pageId}/feed`;
  const postData = {
    message,
    access_token: pageAccessToken,
  };

  // Handle different media types
  if (mediaType === 'link' && link) {
    postData.link = link;
  } else if (mediaType === 'image' && mediaUrls && mediaUrls.length > 0) {
    // For single image, use photos endpoint
    endpoint = `${FACEBOOK_GRAPH_API}/${pageId}/photos`;
    postData.url = mediaUrls[0];
  } else if (mediaType === 'video' && mediaUrls && mediaUrls.length > 0) {
    // For video, use videos endpoint
    endpoint = `${FACEBOOK_GRAPH_API}/${pageId}/videos`;
    postData.file_url = mediaUrls[0];
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to publish to Facebook');
  }

  return data;
}

// POST - Publish a post immediately or publish a scheduled post
export async function POST(request) {
  try {
    const token = request.cookies.get('auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check Facebook connection
    if (!user.facebookData?.connected || !user.facebookData?.pageAccessToken) {
      return NextResponse.json({ 
        error: 'Facebook page not connected. Please connect your Facebook page first.' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { scheduledPostId, message, link, mediaUrls, mediaType, immediate } = body;

    let postContent;
    let scheduledPost = null;

    if (scheduledPostId) {
      // Publishing a scheduled post
      scheduledPost = await ScheduledPost.findOne({
        _id: scheduledPostId,
        userId: decoded.userId,
        platform: 'facebook',
      });

      if (!scheduledPost) {
        return NextResponse.json({ error: 'Scheduled post not found' }, { status: 404 });
      }

      if (scheduledPost.status === 'published') {
        return NextResponse.json({ error: 'Post already published' }, { status: 400 });
      }

      // Mark as publishing
      scheduledPost.status = 'publishing';
      await scheduledPost.save();

      postContent = scheduledPost.content;
    } else if (immediate && message) {
      // Immediate publishing
      postContent = {
        message,
        link,
        mediaUrls: mediaUrls || [],
        mediaType: mediaType || 'none',
      };
    } else {
      return NextResponse.json({ 
        error: 'Either scheduledPostId or message with immediate=true is required' 
      }, { status: 400 });
    }

    try {
      // Publish to Facebook
      const result = await publishToFacebookPage(
        user.facebookData.pageId,
        user.facebookData.pageAccessToken,
        postContent
      );

      // Build post URL
      const postId = result.id || result.post_id;
      const postUrl = `https://facebook.com/${postId}`;

      // Update scheduled post if applicable
      if (scheduledPost) {
        await scheduledPost.markAsPublished(postId, postUrl);
      }

      return NextResponse.json({
        success: true,
        message: 'Post published successfully to Facebook',
        postId,
        postUrl,
        facebookResponse: result,
      });
    } catch (publishError) {
      // Mark as failed if scheduled post
      if (scheduledPost) {
        await scheduledPost.markAsFailed(publishError.message);
      }

      throw publishError;
    }
  } catch (error) {
    console.error('Error publishing to Facebook:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// GET - Get publish status and history
export async function GET(request) {
  try {
    const token = request.cookies.get('auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Get published posts
    const publishedPosts = await ScheduledPost.find({
      userId: decoded.userId,
      platform: 'facebook',
      status: 'published',
    })
      .sort({ publishedAt: -1 })
      .limit(20);

    // Get failed posts
    const failedPosts = await ScheduledPost.find({
      userId: decoded.userId,
      platform: 'facebook',
      status: 'failed',
    })
      .sort({ updatedAt: -1 })
      .limit(10);

    return NextResponse.json({
      success: true,
      publishedPosts,
      failedPosts,
    });
  } catch (error) {
    console.error('Error getting publish history:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
