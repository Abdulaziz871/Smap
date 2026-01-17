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

  // Handle media uploads - only use valid HTTP/HTTPS URLs (not base64)
  const validMediaUrls = (mediaUrls || []).filter(url => 
    url && (url.startsWith('http://') || url.startsWith('https://'))
  );
  
  if (mediaType === 'link' && link) {
    postData.link = link;
  } else if (mediaType === 'image' && validMediaUrls.length > 0) {
    endpoint = `${FACEBOOK_GRAPH_API}/${pageId}/photos`;
    postData.url = validMediaUrls[0];
  } else if (mediaType === 'video' && validMediaUrls.length > 0) {
    endpoint = `${FACEBOOK_GRAPH_API}/${pageId}/videos`;
    postData.file_url = validMediaUrls[0];
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

/**
 * Process a single scheduled post
 */
async function processScheduledPost(post, user) {
  try {
    // Mark as publishing
    post.status = 'publishing';
    await post.save();

    let result;

    if (post.platform === 'facebook') {
      if (!user.facebookData?.pageAccessToken) {
        throw new Error('Facebook page not connected');
      }

      result = await publishToFacebookPage(
        post.pageId || user.facebookData.pageId,
        user.facebookData.pageAccessToken,
        post.content
      );
    } else {
      throw new Error(`Platform ${post.platform} not supported for auto-publishing`);
    }

    // Mark as published
    const postId = result.id || result.post_id;
    const postUrl = `https://facebook.com/${postId}`;
    await post.markAsPublished(postId, postUrl);

    return {
      success: true,
      postId: post._id,
      platform: post.platform,
      publishedPostId: postId,
    };
  } catch (error) {
    // Mark as failed
    await post.markAsFailed(error.message);

    return {
      success: false,
      postId: post._id,
      platform: post.platform,
      error: error.message,
    };
  }
}

/**
 * GET - Process all pending scheduled posts
 * This endpoint should be called by a cron job every minute
 * 
 * You can use services like:
 * - Vercel Cron Jobs
 * - cron-job.org
 * - GitHub Actions scheduled workflows
 * - AWS CloudWatch Events
 * 
 * Example cron: * * * * * (every minute)
 * Call: GET /api/scheduled-posts/process
 */
export async function GET(request) {
  try {
    // Optional: Verify cron secret for security
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get('secret');
    
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Find all posts that are scheduled and due
    const pendingPosts = await ScheduledPost.find({
      status: 'scheduled',
      scheduledTime: { $lte: new Date() },
    }).limit(10); // Process max 10 at a time to avoid timeouts

    if (pendingPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts to process',
        processed: 0,
      });
    }

    const results = [];

    for (const post of pendingPosts) {
      // Get user for this post
      const user = await User.findById(post.userId);
      
      if (!user) {
        await post.markAsFailed('User not found');
        results.push({
          success: false,
          postId: post._id,
          error: 'User not found',
        });
        continue;
      }

      const result = await processScheduledPost(post, user);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} posts`,
      processed: results.length,
      successful: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error('Error processing scheduled posts:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// POST - Manually trigger processing (for testing)
export async function POST(request) {
  return GET(request);
}
