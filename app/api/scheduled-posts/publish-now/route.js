import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import { User } from '../../../../models/User.js';
import ScheduledPost from '../../../../models/ScheduledPost';

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';

/**
 * Strip HTML tags and convert to plain text for social media platforms
 */
function htmlToPlainText(html) {
  if (!html) return '';
  
  // Replace <br> and </p> with newlines
  let text = html.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  
  // Replace list items with bullet points
  text = text.replace(/<li>/gi, '• ');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  
  // Clean up multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  return text.trim();
}

/**
 * Publish a post to Facebook Page
 */
async function publishToFacebookPage(pageId, pageAccessToken, content) {
  const { message, link, mediaUrls, mediaType } = content;
  
  // Convert HTML to plain text for Facebook
  const plainTextMessage = htmlToPlainText(message);
  
  let endpoint = `${FACEBOOK_GRAPH_API}/${pageId}/feed`;
  const postData = {
    message: plainTextMessage,
    access_token: pageAccessToken,
  };

  // Add link if provided
  if (link) {
    postData.link = link;
  }

  // Handle media uploads - only use valid HTTP/HTTPS URLs (not base64)
  const validMediaUrls = (mediaUrls || []).filter(url => 
    url && (url.startsWith('http://') || url.startsWith('https://'))
  );
  
  if (mediaType === 'image' && validMediaUrls.length > 0) {
    endpoint = `${FACEBOOK_GRAPH_API}/${pageId}/photos`;
    postData.url = validMediaUrls[0];
  } else if (mediaType === 'video' && validMediaUrls.length > 0) {
    endpoint = `${FACEBOOK_GRAPH_API}/${pageId}/videos`;
    postData.file_url = validMediaUrls[0];
  }

  console.log('📤 Publishing to Facebook:', { endpoint, hasMessage: !!message, hasLink: !!link });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ Facebook publish error:', data);
    throw new Error(data.error?.message || 'Failed to publish to Facebook');
  }

  console.log('✅ Facebook publish success:', data);
  return data;
}

/**
 * POST - Manually publish a scheduled post immediately
 */
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { postId, userId } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Find the scheduled post
    const post = await ScheduledPost.findOne({ _id: postId, userId });
    
    if (!post) {
      return NextResponse.json({ error: 'Scheduled post not found' }, { status: 404 });
    }

    if (post.status === 'published') {
      return NextResponse.json({ error: 'Post has already been published' }, { status: 400 });
    }

    if (post.status === 'cancelled') {
      return NextResponse.json({ error: 'Post has been cancelled' }, { status: 400 });
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Mark as publishing
    post.status = 'publishing';
    await post.save();

    let result;
    let publishedPostId;
    let postUrl;

    try {
      if (post.platform === 'facebook') {
        if (!user.facebookData?.isConnected || !user.facebookData?.pageAccessToken) {
          throw new Error('Facebook page not connected. Please reconnect your Facebook page.');
        }

        result = await publishToFacebookPage(
          post.pageId || user.facebookData.pageId,
          user.facebookData.pageAccessToken,
          post.content
        );

        publishedPostId = result.id || result.post_id;
        postUrl = `https://facebook.com/${publishedPostId}`;
      } else {
        throw new Error(`Platform ${post.platform} not supported for publishing`);
      }

      // Mark as published
      post.status = 'published';
      post.publishedAt = new Date();
      post.publishedPostId = publishedPostId;
      post.publishedPostUrl = postUrl;
      await post.save();

      return NextResponse.json({
        success: true,
        message: 'Post published successfully!',
        publishedPostId,
        postUrl,
      });

    } catch (publishError) {
      // Mark as failed
      post.status = 'failed';
      post.errorMessage = publishError.message;
      post.retryCount = (post.retryCount || 0) + 1;
      await post.save();

      return NextResponse.json({
        success: false,
        error: publishError.message,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error publishing post:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
