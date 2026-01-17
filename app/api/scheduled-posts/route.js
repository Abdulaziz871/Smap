import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb.js';
import { User } from '../../../models/User.js';
import ScheduledPost from '../../../models/ScheduledPost';

// GET - List scheduled posts
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const page = parseInt(searchParams.get('page')) || 1;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const query = { userId };
    
    if (status) {
      query.status = status;
    }
    
    if (platform) {
      query.platform = platform;
    }

    const total = await ScheduledPost.countDocuments(query);
    const posts = await ScheduledPost.find(query)
      .sort({ scheduledTime: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// POST - Create a new scheduled post
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, platform, message, link, mediaUrls, mediaType, scheduledTime, timezone, aiGenerated, aiPrompt } = body;

    // Validation
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!scheduledTime) {
      return NextResponse.json({ error: 'Scheduled time is required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= new Date()) {
      return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 });
    }

    // Check platform connection
    if (platform === 'facebook') {
      if (!user.facebookData?.isConnected || !user.facebookData?.pageAccessToken) {
        return NextResponse.json({ 
          error: 'Facebook page not connected. Please connect your Facebook page first.' 
        }, { status: 400 });
      }
    }

    // Create scheduled post
    const scheduledPost = new ScheduledPost({
      userId,
      platform,
      pageId: platform === 'facebook' ? user.facebookData.pageId : undefined,
      pageName: platform === 'facebook' ? user.facebookData.pageName : undefined,
      content: {
        message,
        link,
        mediaUrls: mediaUrls || [],
        mediaType: mediaType || 'none',
      },
      scheduledTime: scheduledDate,
      timezone: timezone || 'UTC',
      aiGenerated: aiGenerated || false,
      aiPrompt: aiPrompt || undefined,
    });

    await scheduledPost.save();

    return NextResponse.json({
      success: true,
      post: scheduledPost,
      message: 'Post scheduled successfully',
    });
  } catch (error) {
    console.error('Error creating scheduled post:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// PUT - Update a scheduled post
export async function PUT(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, postId, message, link, mediaUrls, mediaType, scheduledTime, timezone } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const post = await ScheduledPost.findOne({ 
      _id: postId, 
      userId 
    });

    if (!post) {
      return NextResponse.json({ error: 'Scheduled post not found' }, { status: 404 });
    }

    if (post.status !== 'scheduled') {
      return NextResponse.json({ 
        error: 'Only scheduled posts can be updated' 
      }, { status: 400 });
    }

    // Update fields
    if (message) post.content.message = message;
    if (link !== undefined) post.content.link = link;
    if (mediaUrls) post.content.mediaUrls = mediaUrls;
    if (mediaType) post.content.mediaType = mediaType;
    if (timezone) post.timezone = timezone;
    
    if (scheduledTime) {
      const scheduledDate = new Date(scheduledTime);
      if (scheduledDate <= new Date()) {
        return NextResponse.json({ 
          error: 'Scheduled time must be in the future' 
        }, { status: 400 });
      }
      post.scheduledTime = scheduledDate;
    }

    await post.save();

    return NextResponse.json({
      success: true,
      post,
      message: 'Scheduled post updated successfully',
    });
  } catch (error) {
    console.error('Error updating scheduled post:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// DELETE - Cancel/delete a scheduled post
export async function DELETE(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const postId = searchParams.get('postId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const post = await ScheduledPost.findOne({ 
      _id: postId, 
      userId 
    });

    if (!post) {
      return NextResponse.json({ error: 'Scheduled post not found' }, { status: 404 });
    }

    if (post.status === 'published') {
      return NextResponse.json({ 
        error: 'Cannot delete published posts' 
      }, { status: 400 });
    }

    // Mark as cancelled instead of deleting
    post.status = 'cancelled';
    await post.save();

    return NextResponse.json({
      success: true,
      message: 'Scheduled post cancelled successfully',
    });
  } catch (error) {
    console.error('Error deleting scheduled post:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
