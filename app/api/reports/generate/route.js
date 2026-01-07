import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import { User } from '../../../../models/User.js';

export async function POST(request) {
  try {
    // Get request data
    const { reportType, platforms, metrics, startDate, endDate, format, userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Connect to database
    await connectDB();

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate report content based on user's actual data
    const reportContent = await generateReportContent(user, {
      reportType,
      platforms,
      metrics,
      startDate,
      endDate
    });

    // Generate CSV content
    const fileContent = generateCSVContent(reportContent);
    const contentType = 'text/csv';
    const fileExtension = 'csv';

    // Return the file
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="SMAP_Report_${new Date().toISOString().split('T')[0]}.${fileExtension}"`,
      },
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

async function generateReportContent(user, options) {
  const { reportType, platforms, metrics, startDate, endDate } = options;
  
  // Extract YouTube data if available
  const youtubeData = user.youtubeData || {};
  
  // The sync API stores data directly in youtubeData, not in channelStats
  const channelStats = {
    subscriberCount: youtubeData.subscriberCount,
    viewCount: youtubeData.viewCount,
    videoCount: youtubeData.videoCount,
    channelTitle: youtubeData.channelTitle
  };
  
  const videos = youtubeData.videos || [];
  const analytics = youtubeData.analytics || {};

  // Extract Facebook data if available
  const facebookData = user.facebookData || {};
  const facebookAnalytics = facebookData.latestAnalytics || {};
  const facebookPosts = facebookAnalytics.posts || facebookAnalytics.recentPosts || [];

  // Check if we have any real data
  const hasYoutubeData = !!(youtubeData.channelId && youtubeData.subscriberCount);
  const hasVideos = videos.length > 0;
  const hasFacebookData = !!(facebookData.pageId && facebookData.fanCount);
  const hasFacebookPosts = facebookPosts.length > 0;

  console.log('📊 Report generation debug:', {
    userId: user._id,
    platforms: platforms,
    hasYoutubeData,
    hasVideos,
    videosCount: videos.length,
    hasFacebookData,
    hasFacebookPosts,
    facebookPostsCount: facebookPosts.length,
    channelId: youtubeData.channelId,
    pageId: facebookData.pageId,
    lastSynced: youtubeData.lastSynced
  });

  // Calculate date range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  // Filter videos within date range if publishedAt is available
  const filteredVideos = videos.filter(video => {
    if (video.publishedAt) {
      const publishDate = new Date(video.publishedAt);
      return publishDate >= start && publishDate <= end;
    }
    return true; // Include videos without date info
  });

  // Filter Facebook posts within date range
  const filteredFacebookPosts = facebookPosts.filter(post => {
    if (post.created_time) {
      const postDate = new Date(post.created_time);
      return postDate >= start && postDate <= end;
    }
    return true; // Include posts without date info
  });

  const hasAnyData = hasYoutubeData || hasVideos || hasFacebookData || hasFacebookPosts;

  return {
    reportType,
    platforms,
    metrics,
    dateRange: { start: startDate, end: endDate, days: daysDiff },
    user: {
      email: user.email,
      name: user.name || 'SMAP User'
    },
    hasData: hasAnyData,
    data: {
      youtube: {
        connected: !!youtubeData.channelId,
        hasRealData: hasYoutubeData,
        channelStats,
        videoCount: filteredVideos.length,
        totalVideos: videos.length,
        videos: filteredVideos.slice(0, 10), // Top 10 videos
        analytics
      },
      facebook: {
        connected: !!facebookData.pageId,
        hasRealData: hasFacebookData,
        pageStats: {
          pageName: facebookData.pageName,
          fanCount: facebookData.fanCount,
          talkingAboutCount: facebookData.talkingAboutCount,
          category: facebookData.category
        },
        postCount: filteredFacebookPosts.length,
        totalPosts: facebookPosts.length,
        posts: filteredFacebookPosts.slice(0, 10), // Top 10 posts
        analytics: facebookAnalytics
      }
    },
    summary: generateCombinedSummary(youtubeData, facebookData, filteredVideos, filteredFacebookPosts, hasYoutubeData, hasFacebookData)
  };
}

function generateCombinedSummary(youtubeData, facebookData, videos, facebookPosts, hasYoutubeData, hasFacebookData) {
  const summary = {};

  if (hasYoutubeData && videos.length > 0) {
    const totalViews = videos.reduce((sum, video) => sum + (parseInt(video.viewCount) || 0), 0);
    const totalLikes = videos.reduce((sum, video) => sum + (parseInt(video.likeCount) || 0), 0);
    const totalComments = videos.reduce((sum, video) => sum + (parseInt(video.commentCount) || 0), 0);
    
    const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
    const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2) : '0.00';

    summary.youtube = {
      totalSubscribers: youtubeData.subscriberCount || 0,
      totalViews: youtubeData.viewCount || totalViews,
      totalVideos: videos.length,
      avgViewsPerVideo: avgViews,
      engagementRate: `${engagementRate}%`,
      topVideo: videos.sort((a, b) => (parseInt(b.viewCount) || 0) - (parseInt(a.viewCount) || 0))[0] || null
    };
  }

  if (hasFacebookData && facebookPosts.length > 0) {
    const totalLikes = facebookPosts.reduce((sum, post) => sum + (post.likes?.summary?.total_count || 0), 0);
    const totalComments = facebookPosts.reduce((sum, post) => sum + (post.comments?.summary?.total_count || 0), 0);
    const totalShares = facebookPosts.reduce((sum, post) => sum + (post.shares?.count || 0), 0);
    const totalEngagement = totalLikes + totalComments + totalShares;
    
    const avgEngagement = facebookPosts.length > 0 ? Math.round(totalEngagement / facebookPosts.length) : 0;
    const engagementRate = facebookData.fanCount > 0 ? ((avgEngagement / facebookData.fanCount) * 100).toFixed(2) : '0.00';

    summary.facebook = {
      totalFans: facebookData.fanCount || 0,
      totalPosts: facebookPosts.length,
      totalEngagement: totalEngagement,
      avgEngagementPerPost: avgEngagement,
      engagementRate: `${engagementRate}%`,
      topPost: facebookPosts.sort((a, b) => {
        const aEng = (a.likes?.summary?.total_count || 0) + (a.comments?.summary?.total_count || 0) + (a.shares?.count || 0);
        const bEng = (b.likes?.summary?.total_count || 0) + (b.comments?.summary?.total_count || 0) + (b.shares?.count || 0);
        return bEng - aEng;
      })[0] || null
    };
  }

  return summary;
}

function generateSummary(channelStats, videos, analytics) {
  const totalViews = videos.reduce((sum, video) => sum + (parseInt(video.viewCount) || 0), 0);
  const totalLikes = videos.reduce((sum, video) => sum + (parseInt(video.likeCount) || 0), 0);
  const totalComments = videos.reduce((sum, video) => sum + (parseInt(video.commentCount) || 0), 0);
  
  const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
  const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2) : '0.00';

  return {
    totalSubscribers: channelStats.subscriberCount || 0,
    totalViews: channelStats.viewCount || totalViews,
    totalVideos: videos.length,
    avgViewsPerVideo: avgViews,
    engagementRate: `${engagementRate}%`,
    topVideo: videos.sort((a, b) => (parseInt(b.viewCount) || 0) - (parseInt(a.viewCount) || 0))[0] || null
  };
}

function generateTextContent(reportContent) {
  const { reportType, dateRange, user, data, summary, hasData } = reportContent;
  
  let content = `
SMAP ANALYTICS REPORT
=====================

Report Type: ${reportType.replace('-', ' ').toUpperCase()}
Generated for: ${user.name} (${user.email})
Date Range: ${dateRange.start} to ${dateRange.end} (${dateRange.days} days)
Generated on: ${new Date().toLocaleString()}
Platforms: ${reportContent.platforms.join(', ').toUpperCase()}

EXECUTIVE SUMMARY
=================
`;

  if (!hasData) {
    content += `
⚠️  NO DATA AVAILABLE
====================
We couldn't find any analytics data for the selected platforms and date range.

POSSIBLE REASONS:
- No social media accounts connected
- No content published during the selected date range
- Data sync pending (try refreshing your account connections)

NEXT STEPS:
1. Go to "Connect Accounts" page to link your social media profiles
2. Ensure your accounts have published content
3. Wait for data synchronization to complete
4. Try generating the report again

SAMPLE DATA STRUCTURE:
If you had YouTube data, your report would include:
- Channel statistics (subscribers, total views, video count)
- Video performance metrics (views, likes, comments)
- Engagement rates and growth trends
- Top performing content analysis
- Audience insights and recommendations
`;
  } else if (data.youtube.connected && data.youtube.hasRealData) {
    content += `
YOUTUBE PERFORMANCE
==================
Total Subscribers: ${Number(summary.totalSubscribers).toLocaleString()}
Total Channel Views: ${Number(summary.totalViews).toLocaleString()}
Videos in Period: ${summary.totalVideos}
Average Views per Video: ${Number(summary.avgViewsPerVideo).toLocaleString()}
Engagement Rate: ${summary.engagementRate}
`;

    if (summary.topVideo) {
      content += `
TOP PERFORMING VIDEO
===================
Title: ${summary.topVideo.title}
Views: ${Number(summary.topVideo.viewCount || 0).toLocaleString()}
Likes: ${Number(summary.topVideo.likeCount || 0).toLocaleString()}
Comments: ${Number(summary.topVideo.commentCount || 0).toLocaleString()}
Published: ${summary.topVideo.publishedAt ? new Date(summary.topVideo.publishedAt).toLocaleDateString() : 'Unknown'}
`;
    }

    if (data.youtube.videos.length > 0) {
      content += `
RECENT VIDEOS PERFORMANCE
========================
`;
      data.youtube.videos.slice(0, 5).forEach((video, index) => {
        content += `${index + 1}. ${video.title}
   Views: ${Number(video.viewCount || 0).toLocaleString()}
   Likes: ${Number(video.likeCount || 0).toLocaleString()}
   Comments: ${Number(video.commentCount || 0).toLocaleString()}
   
`;
      });
    }
  } else {
    content += `
ACCOUNT STATUS
==============
YouTube Account: ${data.youtube.connected ? '✅ Connected' : '❌ Not Connected'}
Data Available: ${data.youtube.hasRealData ? '✅ Yes' : '❌ No real data found'}

${data.youtube.connected ? 
  'Your account is connected but we haven\'t found substantial analytics data yet. This could mean:\n- Your channel is new\n- Data sync is still in progress\n- No content published in the selected date range' 
  : 'Please connect your YouTube account in the "Connect Accounts" section to generate detailed reports.'}
`;
  }

  content += `
RECOMMENDATIONS
==============
`;

  if (hasData && data.youtube.hasRealData) {
    content += `- Continue creating engaging content to maintain your ${summary.engagementRate} engagement rate
- Consider posting more frequently to increase channel growth
- Analyze your top-performing video "${summary.topVideo?.title || 'N/A'}" to replicate successful content strategies
- Focus on audience retention strategies to improve overall video performance
`;
  } else {
    content += `- Connect your social media accounts to unlock detailed analytics
- Set up regular posting schedules for consistent engagement
- Monitor competitor performance for industry benchmarks
- Use SMAP's analytics tools to track your growth over time
- Ensure your accounts are actively publishing content
`;
  }

  content += `
METHODOLOGY
===========
This report was generated using data collected from connected social media platforms.
Analytics include publicly available metrics and performance indicators.
Data accuracy depends on platform API limitations and real-time availability.

For questions about this report, contact SMAP support.
Report ID: SMAP-${Date.now()}
Generated: ${new Date().toISOString()}
`;

  return content;
}

function generatePDFContent(reportContent) {
  // Import jsPDF and create proper PDF
  const { jsPDF } = require('jspdf');
  const doc = new jsPDF();
  
  let yPosition = 20;
  const { data, summary, hasData, user, dateRange } = reportContent;
  
  // Header
  doc.setFontSize(20);
  doc.text('SMAP Analytics Report', 20, yPosition);
  yPosition += 20;
  
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 10;
  doc.text(`User: ${user.name} (${user.email})`, 20, yPosition);
  yPosition += 10;
  doc.text(`Date Range: ${dateRange.start} to ${dateRange.end}`, 20, yPosition);
  yPosition += 20;
  
  if (!hasData) {
    doc.text('No data available. Please connect your social media accounts.', 20, yPosition);
    return doc.output('arraybuffer');
  }
  
  // YouTube Section
  if (data.youtube.connected && data.youtube.hasRealData) {
    doc.setFontSize(16);
    doc.text('YouTube Analytics', 20, yPosition);
    yPosition += 15;
    
    doc.setFontSize(12);
    doc.text(`Channel: ${data.youtube.channelStats.channelTitle || 'N/A'}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Subscribers: ${summary?.totalSubscribers || data.youtube.channelStats.subscriberCount || 0}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Total Views: ${summary?.totalViews || data.youtube.channelStats.viewCount || 0}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Total Videos: ${summary?.totalVideos || data.youtube.channelStats.videoCount || 0}`, 20, yPosition);
    yPosition += 20;
    
    // Videos Section
    if (data.youtube.videos && data.youtube.videos.length > 0) {
      doc.setFontSize(14);
      doc.text('Recent Videos:', 20, yPosition);
      yPosition += 15;
      
      data.youtube.videos.forEach((video, index) => {
        if (yPosition > 250) { // New page if needed
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(11);
        doc.text(`${index + 1}. ${video.title}`, 20, yPosition);
        yPosition += 8;
        doc.text(`   Views: ${video.viewCount || 0} | Published: ${video.publishedAt || 'Unknown'}`, 25, yPosition);
        yPosition += 12;
      });
    }
  }
  
  return doc.output('arraybuffer');
}

function generateCSVContent(reportContent) {
  const { data, summary, hasData, user, dateRange, metrics, platforms } = reportContent;
  
  let csv = 'SMAP Analytics Report - CSV Export\n';
  csv += `Report Generated,${new Date().toLocaleString()}\n`;
  csv += `User,${user.name} (${user.email})\n`;
  csv += `Date Range,${dateRange.start} to ${dateRange.end}\n`;
  csv += `Selected Platforms,${platforms.join(', ')}\n`;
  csv += `Selected Metrics,${metrics.join(', ')}\n\n`;

  if (!hasData) {
    csv += 'Status,No Data Available\n';
    csv += `YouTube Connected,${data.youtube.connected ? 'Yes' : 'No'}\n`;
    csv += `Facebook Connected,${data.facebook.connected ? 'Yes' : 'No'}\n`;
    csv += 'Recommendation,Connect your social media accounts in the Connect Accounts section\n';
    return csv;
  }

  // Account Overview Section
  csv += 'ACCOUNT OVERVIEW\n';
  csv += 'Metric,Value,Platform\n';

  // YouTube Data
  if (platforms.includes('youtube') && data.youtube.connected && data.youtube.hasRealData) {
    csv += `Channel Name,${data.youtube.channelStats.channelTitle || 'N/A'},YouTube\n`;
    
    if (metrics.includes('Follower Growth') || metrics.includes('All')) {
      csv += `Total Subscribers,${data.youtube.channelStats.subscriberCount || 0},YouTube\n`;
    }
    
    if (metrics.includes('Reach & Impressions') || metrics.includes('All')) {
      csv += `Total Views,${data.youtube.channelStats.viewCount || 0},YouTube\n`;
    }
    
    csv += `Total Videos,${data.youtube.channelStats.videoCount || 0},YouTube\n`;
    csv += `Videos in Report,${data.youtube.videos.length},YouTube\n`;
    
    if (summary.youtube) {
      csv += `Average Views per Video,${summary.youtube.avgViewsPerVideo || 0},YouTube\n`;
      
      if (metrics.includes('Engagement Rate') || metrics.includes('All')) {
        csv += `Engagement Rate,${summary.youtube.engagementRate || '0.00%'},YouTube\n`;
      }
    }
  }

  // Facebook Data
  if (platforms.includes('facebook') && data.facebook.connected && data.facebook.hasRealData) {
    csv += `Page Name,${data.facebook.pageStats.pageName || 'N/A'},Facebook\n`;
    
    if (metrics.includes('Follower Growth') || metrics.includes('All')) {
      csv += `Total Fans,${data.facebook.pageStats.fanCount || 0},Facebook\n`;
    }
    
    csv += `Page Category,${data.facebook.pageStats.category || 'N/A'},Facebook\n`;
    csv += `Talking About This,${data.facebook.pageStats.talkingAboutCount || 0},Facebook\n`;
    csv += `Total Posts,${data.facebook.totalPosts || 0},Facebook\n`;
    csv += `Posts in Report,${data.facebook.posts.length},Facebook\n`;
    
    if (summary.facebook) {
      csv += `Total Engagement,${summary.facebook.totalEngagement || 0},Facebook\n`;
      csv += `Average Engagement per Post,${summary.facebook.avgEngagementPerPost || 0},Facebook\n`;
      
      if (metrics.includes('Engagement Rate') || metrics.includes('All')) {
        csv += `Engagement Rate,${summary.facebook.engagementRate || '0.00%'},Facebook\n`;
      }
    }
  }

  csv += '\n';

  // Detailed Analytics Sections
  
  // YouTube Video Analytics
  if (platforms.includes('youtube') && (metrics.includes('Top Posts') || metrics.includes('All')) && data.youtube.videos.length > 0) {
    csv += 'DETAILED YOUTUBE VIDEO ANALYTICS\n';
    csv += 'Video Title,Video ID,Views,Likes,Comments,Published Date,Duration,Description Preview\n';
    data.youtube.videos.forEach(video => {
      const description = video.description ? video.description.substring(0, 100).replace(/"/g, '""') : 'N/A';
      csv += `"${video.title}","${video.id}",${video.viewCount || 0},${video.likeCount || 0},${video.commentCount || 0},"${video.publishedAt || 'Unknown'}","${video.duration || 'N/A'}","${description}"\n`;
    });
    csv += '\n';
  }

  // Facebook Post Analytics
  if (platforms.includes('facebook') && (metrics.includes('Top Posts') || metrics.includes('All')) && data.facebook.posts.length > 0) {
    csv += 'DETAILED FACEBOOK POST ANALYTICS\n';
    csv += 'Post Message,Post ID,Likes,Comments,Shares,Total Engagement,Created Date\n';
    data.facebook.posts.forEach(post => {
      const message = post.message ? post.message.substring(0, 100).replace(/"/g, '""') : 'No message';
      const likes = post.likes?.summary?.total_count || 0;
      const comments = post.comments?.summary?.total_count || 0;
      const shares = post.shares?.count || 0;
      const totalEngagement = likes + comments + shares;
      csv += `"${message}","${post.id}",${likes},${comments},${shares},${totalEngagement},"${post.created_time || 'Unknown'}"\n`;
    });
    csv += '\n';
  }

  // Performance Summary
  csv += 'PERFORMANCE SUMMARY\n';
  csv += 'Platform,Metric,Value\n';
  
  if (summary.youtube) {
    csv += `YouTube,Best Performing Video,"${summary.youtube.topVideo?.title || 'N/A'}"\n`;
    csv += `YouTube,Top Video Views,${summary.youtube.topVideo?.viewCount || 0}\n`;
  }
  
  if (summary.facebook) {
    csv += `Facebook,Best Performing Post,"${summary.facebook.topPost?.message?.substring(0, 50) || 'N/A'}"\n`;
    csv += `Facebook,Top Post Engagement,${((summary.facebook.topPost?.likes?.summary?.total_count || 0) + (summary.facebook.topPost?.comments?.summary?.total_count || 0) + (summary.facebook.topPost?.shares?.count || 0))}\n`;
  }

  return csv;
}
