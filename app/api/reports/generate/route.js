import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import { User } from '../../../../models/User.js';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

// Arabic text reshaping
let arabicReshaper = null;

// Load Arabic reshaper dynamically
async function loadArabicReshaper() {
  if (arabicReshaper) return arabicReshaper;
  try {
    const module = await import('arabic-reshaper');
    arabicReshaper = module.default || module;
    console.log('✅ Arabic reshaper loaded');
  } catch (error) {
    console.log('⚠️ Could not load Arabic reshaper:', error.message);
  }
  return arabicReshaper;
}

// Load Amiri Arabic font if available
let amiriFontLoaded = false;
let amiriFontBase64 = null;

async function loadArabicFont() {
  if (amiriFontLoaded) return amiriFontBase64;
  
  try {
    // Try to load a local Arabic font file
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Amiri-Regular.ttf');
    if (fs.existsSync(fontPath)) {
      const fontBuffer = fs.readFileSync(fontPath);
      amiriFontBase64 = fontBuffer.toString('base64');
      amiriFontLoaded = true;
      console.log('✅ Arabic font loaded successfully');
    } else {
      console.log('⚠️ Arabic font not found at:', fontPath);
    }
  } catch (error) {
    console.log('⚠️ Could not load Arabic font:', error.message);
  }
  
  return amiriFontBase64;
}

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

    // Generate content based on format
    let fileContent;
    let contentType;
    let fileExtension;

    if (format === 'PDF') {
      fileContent = await generatePDFContent(reportContent);
      contentType = 'application/pdf';
      fileExtension = 'pdf';
    } else {
      fileContent = generateCSVContent(reportContent);
      contentType = 'text/csv';
      fileExtension = 'csv';
    }

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

  // YouTube summary - include even with no videos if channel is connected
  if (hasYoutubeData) {
    const totalViews = videos.reduce((sum, video) => sum + (parseInt(video.viewCount) || 0), 0);
    const totalLikes = videos.reduce((sum, video) => sum + (parseInt(video.likeCount) || 0), 0);
    const totalComments = videos.reduce((sum, video) => sum + (parseInt(video.commentCount) || 0), 0);
    
    const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
    const avgLikes = videos.length > 0 ? Math.round(totalLikes / videos.length) : 0;
    const avgComments = videos.length > 0 ? Math.round(totalComments / videos.length) : 0;
    const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2) : '0.00';

    summary.youtube = {
      totalSubscribers: parseInt(youtubeData.subscriberCount) || 0,
      totalViews: parseInt(youtubeData.viewCount) || totalViews,
      totalVideos: videos.length,
      totalLikes: totalLikes,
      totalComments: totalComments,
      avgViewsPerVideo: avgViews,
      avgLikesPerVideo: avgLikes,
      avgCommentsPerVideo: avgComments,
      engagementRate: `${engagementRate}%`,
      topVideo: videos.length > 0 ? videos.sort((a, b) => (parseInt(b.viewCount) || 0) - (parseInt(a.viewCount) || 0))[0] : null
    };
  }

  // Facebook summary - include even with no posts if page is connected
  if (hasFacebookData) {
    const totalLikes = facebookPosts.reduce((sum, post) => sum + (post.likes?.summary?.total_count || 0), 0);
    const totalComments = facebookPosts.reduce((sum, post) => sum + (post.comments?.summary?.total_count || 0), 0);
    const totalShares = facebookPosts.reduce((sum, post) => sum + (post.shares?.count || 0), 0);
    const totalEngagement = totalLikes + totalComments + totalShares;
    
    const avgLikes = facebookPosts.length > 0 ? Math.round(totalLikes / facebookPosts.length) : 0;
    const avgComments = facebookPosts.length > 0 ? Math.round(totalComments / facebookPosts.length) : 0;
    const avgShares = facebookPosts.length > 0 ? Math.round(totalShares / facebookPosts.length) : 0;
    const avgEngagement = facebookPosts.length > 0 ? Math.round(totalEngagement / facebookPosts.length) : 0;
    const engagementRate = facebookData.fanCount > 0 ? ((avgEngagement / facebookData.fanCount) * 100).toFixed(2) : '0.00';

    summary.facebook = {
      totalFans: parseInt(facebookData.fanCount) || 0,
      totalPosts: facebookPosts.length,
      totalLikes: totalLikes,
      totalComments: totalComments,
      totalShares: totalShares,
      totalEngagement: totalEngagement,
      avgLikesPerPost: avgLikes,
      avgCommentsPerPost: avgComments,
      avgSharesPerPost: avgShares,
      avgEngagementPerPost: avgEngagement,
      engagementRate: `${engagementRate}%`,
      topPost: facebookPosts.length > 0 ? facebookPosts.sort((a, b) => {
        const aEng = (a.likes?.summary?.total_count || 0) + (a.comments?.summary?.total_count || 0) + (a.shares?.count || 0);
        const bEng = (b.likes?.summary?.total_count || 0) + (b.comments?.summary?.total_count || 0) + (b.shares?.count || 0);
        return bEng - aEng;
      })[0] : null
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

// Helper function to check if text contains Arabic
function containsArabic(text) {
  if (!text) return false;
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
}

// Helper function to reshape Arabic text for PDF rendering
function reshapeArabic(text) {
  if (!text || !containsArabic(text)) return text;
  
  try {
    if (arabicReshaper) {
      // Use arabic-reshaper to properly connect Arabic letters
      const reshaped = arabicReshaper(text);
      // Reverse the text for RTL display in jsPDF
      return reshaped.split('').reverse().join('');
    }
  } catch (error) {
    console.log('⚠️ Arabic reshaping failed:', error.message);
  }
  
  // Fallback: just reverse the text
  return text.split('').reverse().join('');
}

// Helper function to sanitize text for PDF (handle Arabic/Unicode)
function sanitizeTextForPDF(text) {
  if (!text) return 'N/A';
  return String(text);
}

// Generate PDF content
async function generatePDFContent(reportContent) {
  const { dateRange, platforms, metrics, data, summary, user, hasData } = reportContent;
  
  // Create PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;
  
  // Load Arabic reshaper
  await loadArabicReshaper();
  
  // Try to load Arabic font
  const arabicFont = await loadArabicFont();
  let hasArabicFont = false;
  
  if (arabicFont) {
    try {
      doc.addFileToVFS('Amiri-Regular.ttf', arabicFont);
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
      hasArabicFont = true;
      console.log('✅ Arabic font registered with jsPDF');
    } catch (error) {
      console.log('⚠️ Could not register Arabic font:', error.message);
    }
  }
  
  // Helper to render text with Arabic support
  const renderText = (text, x, y, options = {}) => {
    if (hasArabicFont && containsArabic(text)) {
      doc.setFont('Amiri', 'normal');
      const reshapedText = reshapeArabic(text);
      doc.text(reshapedText, x, y, options);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text(text, x, y, options);
    }
  };
  
  // Helper to set font based on text content
  const setFontForText = (text) => {
    if (hasArabicFont && containsArabic(text)) {
      doc.setFont('Amiri', 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }
  };
  
  // Colors
  const primaryColor = [42, 71, 89]; // #2A4759
  const accentColor = [247, 155, 114]; // #F79B72
  const textColor = [51, 51, 51];
  const lightGray = [200, 200, 200];
  const successColor = [40, 167, 69]; // Green
  const warningColor = [255, 193, 7]; // Yellow
  const infoColor = [23, 162, 184]; // Cyan
  
  // Helper function to add a new page if needed
  const checkNewPage = (requiredSpace = 30) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };
  
  // Helper to draw a horizontal line
  const drawLine = (y, color = lightGray) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
  };
  
  // Helper to draw a section header
  const drawSectionHeader = (title, bgColor = primaryColor) => {
    checkNewPage(40);
    doc.setFillColor(...bgColor);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 5, yPos + 8);
    yPos += 18;
  };
  
  // ===== HEADER =====
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // System name and date
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('SMAP - Social Media Analytics Platform', margin, 12);
  doc.text(new Date().toISOString().split('T')[0], pageWidth - margin, 12, { align: 'right' });
  
  // Report title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Social Media Analytics Report', margin, 30);
  
  // Date range subtitle
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report Period: ${dateRange.start} to ${dateRange.end}`, margin, 42);
  
  // User info
  doc.text(`Generated for: ${user.name || user.email}`, pageWidth - margin, 42, { align: 'right' });
  
  yPos = 65;
  
  // ===== APPLIED FILTERS SECTION =====
  doc.setFillColor(240, 245, 250);
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 40, 3, 3, 'F');
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 40, 3, 3, 'S');
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Applied Filters', margin + 10, yPos + 12);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text(`Date Range: ${dateRange.start} to ${dateRange.end} (${dateRange.days} days)`, margin + 10, yPos + 26);
  doc.text(`Platforms: ${platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}`, margin + 10, yPos + 36);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 10, yPos + 26, { align: 'right' });
  
  yPos += 55;
  
  // ===== EXECUTIVE SUMMARY SECTION =====
  doc.setTextColor(...primaryColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, yPos);
  yPos += 5;
  drawLine(yPos, accentColor);
  yPos += 15;
  
  if (!hasData) {
    doc.setFillColor(255, 243, 205);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 50, 3, 3, 'F');
    doc.setTextColor(133, 100, 4);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('No Data Available', margin + 10, yPos + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('No analytics data was found for the selected date range and platforms.', margin + 10, yPos + 28);
    doc.text('Please ensure your social media accounts are connected and data is synced.', margin + 10, yPos + 40);
    yPos += 60;
  } else {
    // Calculate totals for summary - ONLY for SELECTED platforms
    let totalFollowers = 0;
    let totalEngagement = 0;
    let totalContent = 0;
    let activePlatforms = 0;
    
    // Only include YouTube data if YouTube is in selected platforms
    if (platforms.includes('youtube') && data.youtube?.connected) {
      const youtubeSubscribers = summary.youtube?.totalSubscribers || data.youtube?.channelStats?.subscriberCount || 0;
      const youtubeViews = summary.youtube?.totalViews || data.youtube?.channelStats?.viewCount || 0;
      totalFollowers += parseInt(youtubeSubscribers) || 0;
      totalEngagement += parseInt(youtubeViews) || 0;
      totalContent += data.youtube?.videos?.length || 0;
      activePlatforms++;
    }
    
    // Only include Facebook data if Facebook is in selected platforms
    if (platforms.includes('facebook') && data.facebook?.connected) {
      const facebookFans = summary.facebook?.totalFans || data.facebook?.pageStats?.fanCount || 0;
      const facebookEngagement = summary.facebook?.totalEngagement || 0;
      totalFollowers += parseInt(facebookFans) || 0;
      totalEngagement += parseInt(facebookEngagement) || 0;
      totalContent += data.facebook?.posts?.length || 0;
      activePlatforms++;
    }
    
    // Summary cards - 4 cards in a row
    const cardWidth = (pageWidth - (margin * 2) - 30) / 4;
    const cardHeight = 45;
    let cardX = margin;
    
    // Card 1: Total Followers/Fans
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(1.5);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 4, 4, 'FD');
    doc.setTextColor(...accentColor);
    doc.setFontSize(totalFollowers > 999999 ? 14 : (totalFollowers > 99999 ? 16 : 20));
    doc.setFont('helvetica', 'bold');
    doc.text(totalFollowers.toLocaleString(), cardX + cardWidth/2, yPos + 22, { align: 'center' });
    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Followers/Fans', cardX + cardWidth/2, yPos + 34, { align: 'center' });
    
    // Card 2: Total Engagement
    cardX += cardWidth + 10;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 4, 4, 'FD');
    doc.setTextColor(...accentColor);
    doc.setFontSize(totalEngagement > 999999 ? 14 : (totalEngagement > 99999 ? 16 : 20));
    doc.setFont('helvetica', 'bold');
    doc.text(totalEngagement.toLocaleString(), cardX + cardWidth/2, yPos + 22, { align: 'center' });
    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Views/Engagement', cardX + cardWidth/2, yPos + 34, { align: 'center' });
    
    // Card 3: Content Items
    cardX += cardWidth + 10;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 4, 4, 'FD');
    doc.setTextColor(...accentColor);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(totalContent.toString(), cardX + cardWidth/2, yPos + 22, { align: 'center' });
    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Content Analyzed', cardX + cardWidth/2, yPos + 34, { align: 'center' });
    
    // Card 4: Platforms Connected
    cardX += cardWidth + 10;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 4, 4, 'FD');
    doc.setTextColor(...accentColor);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(activePlatforms.toString(), cardX + cardWidth/2, yPos + 22, { align: 'center' });
    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Platforms Connected', cardX + cardWidth/2, yPos + 34, { align: 'center' });
    
    yPos += 60;
    
    // Key Insights Section
    checkNewPage(60);
    doc.setTextColor(...primaryColor);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Performance Insights', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    
    const insights = [];
    // Only show insights for SELECTED platforms
    if (platforms.includes('youtube') && summary.youtube) {
      insights.push(`• YouTube Channel has ${summary.youtube.totalSubscribers?.toLocaleString() || 0} subscribers with ${summary.youtube.engagementRate} engagement rate`);
      if (summary.youtube.avgViewsPerVideo) {
        insights.push(`• Average ${summary.youtube.avgViewsPerVideo.toLocaleString()} views per video in the report period`);
      }
    }
    if (platforms.includes('facebook') && summary.facebook) {
      insights.push(`• Facebook Page has ${summary.facebook.totalFans?.toLocaleString() || 0} fans with ${summary.facebook.engagementRate} engagement rate`);
      if (summary.facebook.avgEngagementPerPost) {
        insights.push(`• Average ${summary.facebook.avgEngagementPerPost.toLocaleString()} engagements per post`);
      }
    }
    
    insights.forEach(insight => {
      doc.text(insight, margin, yPos);
      yPos += 8;
    });
    
    yPos += 10;
  }
  
  // ===== YOUTUBE DATA =====
  if (platforms.includes('youtube') && data.youtube?.connected) {
    checkNewPage(80);
    
    // YouTube header
    doc.setFillColor(255, 0, 0);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('YouTube Analytics', margin + 5, yPos + 7);
    yPos += 20;
    
    if (data.youtube.hasRealData) {
      // YouTube stats table
      const stats = data.youtube.channelStats;
      
      // Table header
      doc.setFillColor(...primaryColor);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Metric', margin + 5, yPos + 7);
      doc.text('Value', pageWidth - margin - 50, yPos + 7);
      yPos += 10;
      
      // Table rows
      // Channel Overview Table
      doc.setTextColor(...primaryColor);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Channel Overview', margin, yPos);
      yPos += 8;
      
      const youtubeMetrics = [
        ['Channel Name', stats.channelTitle || 'N/A'],
        ['Subscribers', (parseInt(stats.subscriberCount) || 0).toLocaleString()],
        ['Total Channel Views', (parseInt(stats.viewCount) || 0).toLocaleString()],
        ['Total Videos on Channel', (parseInt(stats.videoCount) || 0).toString()],
        ['Videos Analyzed', (data.youtube.videos?.length || 0).toString()],
        ['Engagement Rate', summary.youtube?.engagementRate || '0.00%']
      ];
      
      doc.setTextColor(...textColor);
      doc.setFont('helvetica', 'normal');
      youtubeMetrics.forEach((row, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
        }
        doc.text(row[0], margin + 5, yPos + 6);
        doc.text(row[1], pageWidth - margin - 60, yPos + 6);
        yPos += 8;
      });
      
      yPos += 12;
      
      // YouTube Engagement Breakdown
      checkNewPage(70);
      doc.setTextColor(...primaryColor);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Engagement Breakdown', margin, yPos);
      yPos += 10;
      
      // Engagement breakdown table
      doc.setFillColor(...primaryColor);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Metric', margin + 5, yPos + 7);
      doc.text('Total', pageWidth/2 - 20, yPos + 7);
      doc.text('Average/Video', pageWidth - margin - 40, yPos + 7);
      yPos += 10;
      
      const youtubeEngagement = [
        ['Views', (summary.youtube?.totalViews || 0).toLocaleString(), (summary.youtube?.avgViewsPerVideo || 0).toLocaleString()],
        ['Likes', (summary.youtube?.totalLikes || 0).toLocaleString(), (summary.youtube?.avgLikesPerVideo || 0).toLocaleString()],
        ['Comments', (summary.youtube?.totalComments || 0).toLocaleString(), (summary.youtube?.avgCommentsPerVideo || 0).toLocaleString()],
      ];
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      youtubeEngagement.forEach((row, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
        }
        doc.text(row[0], margin + 5, yPos + 6);
        doc.text(row[1], pageWidth/2 - 20, yPos + 6);
        doc.text(row[2], pageWidth - margin - 40, yPos + 6);
        yPos += 8;
      });
      yPos += 12;
      
      // Top Performing Videos
      if (data.youtube.videos && data.youtube.videos.length > 0) {
        checkNewPage(60);
        
        doc.setTextColor(...primaryColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Performing Videos', margin, yPos);
        yPos += 8;
        
        // Videos table header
        doc.setFillColor(...primaryColor);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('Title', margin + 3, yPos + 5.5);
        doc.text('Views', pageWidth - margin - 60, yPos + 5.5);
        doc.text('Likes', pageWidth - margin - 35, yPos + 5.5);
        doc.text('Comments', pageWidth - margin - 10, yPos + 5.5, { align: 'right' });
        yPos += 8;
        
        doc.setTextColor(...textColor);
        doc.setFont('helvetica', 'normal');
        const topVideos = data.youtube.videos.slice(0, 10); // Show more videos
        topVideos.forEach((video, i) => {
          checkNewPage(14);
          if (i % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, yPos, pageWidth - (margin * 2), 12, 'F');
          }
          const title = sanitizeTextForPDF(video.title || 'Untitled').substring(0, 45);
          doc.setFontSize(8);
          doc.text(title, margin + 3, yPos + 5);
          
          // Show publish date if available
          if (video.publishedAt) {
            doc.setFontSize(7);
            doc.setTextColor(120, 120, 120);
            const pubDate = new Date(video.publishedAt).toLocaleDateString();
            doc.text(pubDate, margin + 3, yPos + 10);
            doc.setTextColor(...textColor);
          }
          
          doc.setFontSize(8);
          doc.text((video.viewCount || 0).toLocaleString(), pageWidth - margin - 60, yPos + 7);
          doc.text((video.likeCount || 0).toLocaleString(), pageWidth - margin - 35, yPos + 7);
          doc.text((video.commentCount || 0).toLocaleString(), pageWidth - margin - 10, yPos + 7, { align: 'right' });
          yPos += 12;
        });
        yPos += 10;
        
        // Video Performance Summary
        checkNewPage(50);
        doc.setTextColor(...primaryColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Video Performance Summary', margin, yPos);
        yPos += 10;
        
        // Calculate video totals
        const totalVideoViews = data.youtube.videos.reduce((sum, v) => sum + (parseInt(v.viewCount) || 0), 0);
        const totalVideoLikes = data.youtube.videos.reduce((sum, v) => sum + (parseInt(v.likeCount) || 0), 0);
        const totalVideoComments = data.youtube.videos.reduce((sum, v) => sum + (parseInt(v.commentCount) || 0), 0);
        const avgVideoViews = data.youtube.videos.length > 0 ? Math.round(totalVideoViews / data.youtube.videos.length) : 0;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textColor);
        
        const videoSummary = [
          `Total Views (in period): ${totalVideoViews.toLocaleString()}`,
          `Total Likes: ${totalVideoLikes.toLocaleString()}`,
          `Total Comments: ${totalVideoComments.toLocaleString()}`,
          `Average Views per Video: ${avgVideoViews.toLocaleString()}`,
          `Videos Analyzed: ${data.youtube.videos.length}`
        ];
        
        videoSummary.forEach(item => {
          doc.text(`• ${item}`, margin + 5, yPos);
          yPos += 7;
        });
        yPos += 10;
      }
    } else {
      doc.setTextColor(...textColor);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('YouTube connected but no analytics data available. Please sync your data.', margin, yPos);
      yPos += 15;
    }
  }
  
  // ===== FACEBOOK DATA =====
  if (platforms.includes('facebook') && data.facebook?.connected) {
    checkNewPage(80);
    
    // Facebook header
    doc.setFillColor(24, 119, 242);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Facebook Analytics', margin + 5, yPos + 8);
    yPos += 20;
    
    if (data.facebook.hasRealData) {
      const pageStats = data.facebook.pageStats;
      
      // Page Overview Table
      doc.setTextColor(...primaryColor);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Page Overview', margin, yPos);
      yPos += 8;
      
      // Table header
      doc.setFillColor(...primaryColor);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Metric', margin + 5, yPos + 7);
      doc.text('Value', pageWidth - margin - 60, yPos + 7);
      yPos += 10;
      
      const facebookMetrics = [
        ['Page Name', sanitizeTextForPDF(pageStats.pageName)],
        ['Total Fans/Followers', (pageStats.fanCount || 0).toLocaleString()],
        ['Category', sanitizeTextForPDF(pageStats.category)],
        ['Talking About This', (pageStats.talkingAboutCount || 0).toLocaleString()],
        ['Posts Analyzed', (data.facebook.posts?.length || 0).toString()],
        ['Total Engagement', (summary.facebook?.totalEngagement || 0).toLocaleString()],
        ['Engagement Rate', summary.facebook?.engagementRate || '0.00%']
      ];
      
      doc.setTextColor(...textColor);
      facebookMetrics.forEach((row, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.text(row[0], margin + 5, yPos + 6);
        // Handle text that might be too long for the value column
        let valueText = String(row[1]).substring(0, 50);
        // Use Arabic font and reshape if needed
        if (hasArabicFont && containsArabic(valueText)) {
          doc.setFont('Amiri', 'normal');
          valueText = reshapeArabic(valueText);
        }
        doc.text(valueText, pageWidth - margin - 60, yPos + 6);
        doc.setFont('helvetica', 'normal');
        yPos += 8;
      });
      
      yPos += 12;
      
      // Detailed Facebook Engagement Breakdown
      checkNewPage(70);
      doc.setTextColor(...primaryColor);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Engagement Breakdown', margin, yPos);
      yPos += 10;
      
      // Engagement breakdown table
      doc.setFillColor(...primaryColor);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Metric', margin + 5, yPos + 7);
      doc.text('Total', pageWidth/2 - 20, yPos + 7);
      doc.text('Average/Post', pageWidth - margin - 40, yPos + 7);
      yPos += 10;
      
      const engagementBreakdown = [
        ['Likes', (summary.facebook?.totalLikes || 0).toLocaleString(), (summary.facebook?.avgLikesPerPost || 0).toLocaleString()],
        ['Comments', (summary.facebook?.totalComments || 0).toLocaleString(), (summary.facebook?.avgCommentsPerPost || 0).toLocaleString()],
        ['Shares', (summary.facebook?.totalShares || 0).toLocaleString(), (summary.facebook?.avgSharesPerPost || 0).toLocaleString()],
        ['Total Engagement', (summary.facebook?.totalEngagement || 0).toLocaleString(), (summary.facebook?.avgEngagementPerPost || 0).toLocaleString()]
      ];
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      engagementBreakdown.forEach((row, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
        }
        doc.text(row[0], margin + 5, yPos + 6);
        doc.text(row[1], pageWidth/2 - 20, yPos + 6);
        doc.text(row[2], pageWidth - margin - 40, yPos + 6);
        yPos += 8;
      });
      yPos += 12;
      
      // Top Performing Posts
      if (data.facebook.posts && data.facebook.posts.length > 0) {
        checkNewPage(60);
        
        doc.setTextColor(...primaryColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Performing Posts', margin, yPos);
        yPos += 8;
        
        // Posts table header
        doc.setFillColor(...primaryColor);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('Post Content', margin + 3, yPos + 5.5);
        doc.text('Likes', pageWidth - margin - 55, yPos + 5.5);
        doc.text('Comments', pageWidth - margin - 35, yPos + 5.5);
        doc.text('Shares', pageWidth - margin - 12, yPos + 5.5, { align: 'right' });
        yPos += 8;
        
        doc.setTextColor(...textColor);
        doc.setFont('helvetica', 'normal');
        const topPosts = data.facebook.posts.slice(0, 10); // Show more posts
        topPosts.forEach((post, i) => {
          checkNewPage(14);
          if (i % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, yPos, pageWidth - (margin * 2), 12, 'F');
          }
          // Sanitize post message for Arabic
          const rawMessage = post.message || 'No message';
          let message = sanitizeTextForPDF(rawMessage).substring(0, 45);
          const likes = post.likes?.summary?.total_count || 0;
          const comments = post.comments?.summary?.total_count || 0;
          const shares = post.shares?.count || 0;
          
          doc.setFontSize(8);
          // Use Arabic font and reshape if message contains Arabic
          if (hasArabicFont && containsArabic(message)) {
            doc.setFont('Amiri', 'normal');
            message = reshapeArabic(message);
          } else {
            doc.setFont('helvetica', 'normal');
          }
          doc.text(message, margin + 3, yPos + 5);
          
          // Show date if available
          if (post.created_time) {
            doc.setFontSize(7);
            doc.setTextColor(120, 120, 120);
            doc.setFont('helvetica', 'normal');
            const postDate = new Date(post.created_time).toLocaleDateString();
            doc.text(postDate, margin + 3, yPos + 10);
            doc.setTextColor(...textColor);
          }
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(likes.toLocaleString(), pageWidth - margin - 55, yPos + 7);
          doc.text(comments.toLocaleString(), pageWidth - margin - 35, yPos + 7);
          doc.text(shares.toLocaleString(), pageWidth - margin - 12, yPos + 7, { align: 'right' });
          yPos += 12;
        });
        yPos += 10;
      }
    } else {
      doc.setTextColor(...textColor);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Facebook connected but no analytics data available. Please sync your data.', margin, yPos);
      yPos += 15;
    }
  }
  
  // ===== RECOMMENDATIONS SECTION =====
  if (hasData) {
    checkNewPage(80);
    
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendations & Insights', margin, yPos);
    yPos += 5;
    drawLine(yPos, accentColor);
    yPos += 12;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    
    const recommendations = [];
    
    // YouTube recommendations - only if YouTube is selected
    if (platforms.includes('youtube') && summary.youtube) {
      const ytEngRate = parseFloat(summary.youtube.engagementRate || '0');
      if (ytEngRate < 2) {
        recommendations.push('• YouTube: Consider improving video titles and thumbnails to increase engagement');
      } else if (ytEngRate < 5) {
        recommendations.push('• YouTube: Good engagement! Try adding more calls-to-action in your videos');
      } else {
        recommendations.push('• YouTube: Excellent engagement rate! Keep up the great content strategy');
      }
      
      if (summary.youtube.avgViewsPerVideo < 100) {
        recommendations.push('• YouTube: Focus on SEO optimization and promote videos on other platforms');
      }
    }
    
    // Facebook recommendations - only if Facebook is selected
    if (platforms.includes('facebook') && summary.facebook) {
      const fbEngRate = parseFloat(summary.facebook.engagementRate || '0');
      if (fbEngRate < 1) {
        recommendations.push('• Facebook: Try posting more engaging content like polls, questions, or behind-the-scenes');
      } else if (fbEngRate < 3) {
        recommendations.push('• Facebook: Good engagement! Consider increasing posting frequency');
      } else {
        recommendations.push('• Facebook: Excellent engagement! Your audience loves your content');
      }
      
      if (summary.facebook.totalPosts < 5) {
        recommendations.push('• Facebook: Increase posting frequency to maintain audience engagement');
      }
    }
    
    // General recommendations
    if (platforms.length > 1) {
      recommendations.push('• Cross-Platform: Share your content across all connected platforms for maximum reach');
    }
    recommendations.push('• Timing: Analyze your best-performing content to identify optimal posting times');
    recommendations.push('• Consistency: Maintain a regular posting schedule to keep your audience engaged');
    
    recommendations.forEach(rec => {
      checkNewPage(10);
      doc.text(rec, margin, yPos);
      yPos += 8;
    });
    
    yPos += 15;
  }
  
  // ===== REPORT METADATA =====
  checkNewPage(50);
  
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 40, 3, 3, 'F');
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Information', margin + 10, yPos + 12);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin + 10, yPos + 24);
  doc.text(`Report Period: ${dateRange.days} days`, margin + 10, yPos + 34);
  doc.text(`Platforms Analyzed: ${platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}`, pageWidth / 2, yPos + 24);
  doc.text(`User: ${user.email}`, pageWidth / 2, yPos + 34);
  
  // ===== FOOTER =====
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...primaryColor);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(`Generated by SMAP - Social Media Analytics Platform`, margin, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }
  
  // Return PDF as buffer
  return Buffer.from(doc.output('arraybuffer'));
}
