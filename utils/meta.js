import fetch from 'node-fetch';

/**
 * Meta (Instagram & Facebook) API Utilities
 * Supports Instagram Basic Display API and Facebook Graph API
 */

// Meta OAuth2 configuration
const META_CONFIG = {
  clientId: process.env.META_CLIENT_ID,
  clientSecret: process.env.META_CLIENT_SECRET,
  redirectUri: process.env.META_REDIRECT_URI,
  baseUrl: 'https://graph.facebook.com/v18.0'
};

// Instagram Basic Display configuration
const INSTAGRAM_CONFIG = {
  clientId: process.env.INSTAGRAM_CLIENT_ID,
  clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
  redirectUri: process.env.INSTAGRAM_REDIRECT_URI || process.env.META_REDIRECT_URI,
  baseUrl: 'https://api.instagram.com'
};

// Debug logging
console.log('🔧 Instagram Config:', {
  clientId: INSTAGRAM_CONFIG.clientId,
  redirectUri: INSTAGRAM_CONFIG.redirectUri,
  hasSecret: !!INSTAGRAM_CONFIG.clientSecret
});

// Required scopes for Instagram and Facebook
const INSTAGRAM_SCOPES = [
  'user_profile',
  'user_media'
];

const FACEBOOK_SCOPES = [
  'pages_read_engagement',
  'pages_read_user_content',  // Required to read Page posts
  'pages_show_list',
  'business_management',
  'read_insights',
  'pages_manage_posts'  // Required to publish posts
];

/**
 * Generate Meta OAuth authorization URL
 * Creates Instagram Professional Account connection like Metricool
 */
export function getMetaAuthUrl(platform = 'instagram', state) {
  if (platform === 'instagram') {
    // Instagram Professional Account API (like Metricool)
    // Only use valid Graph API scopes - Instagram permissions are accessed through pages
    const params = new URLSearchParams({
      client_id: META_CONFIG.clientId,
      redirect_uri: META_CONFIG.redirectUri,
      scope: 'pages_show_list,pages_read_engagement,business_management,pages_manage_metadata,read_insights',
      response_type: 'code',
      state: JSON.stringify({ platform, userId: state }),
      display: 'popup',
      auth_type: 'rerequest' // Force Instagram permissions dialog
    });
    
    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  } else {
    // Facebook Login
    const params = new URLSearchParams({
      client_id: META_CONFIG.clientId,
      redirect_uri: META_CONFIG.redirectUri,
      scope: FACEBOOK_SCOPES.join(','),
      response_type: 'code',
      state: JSON.stringify({ platform, userId: state })
    });
    
    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }
}

/**
 * Exchange authorization code for access tokens
 */
export async function getMetaTokens(code, platform = 'facebook') {
  try {
    // Use Facebook OAuth token exchange for both platforms
    const params = new URLSearchParams({
      client_id: META_CONFIG.clientId,
      client_secret: META_CONFIG.clientSecret,
      redirect_uri: META_CONFIG.redirectUri,
      code: code
    });

    const response = await fetch(`${META_CONFIG.baseUrl}/oauth/access_token`, {
      method: 'POST',
      body: params
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to get Meta tokens');
    }

    // Exchange short-lived token for long-lived token
    const longLivedToken = await getLongLivedToken(data.access_token);
    
    return {
      access_token: longLivedToken.access_token,
      expires_in: longLivedToken.expires_in,
      token_type: 'bearer'
    };
  } catch (error) {
    console.error('Error getting Meta tokens:', error);
    throw error;
  }
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function getLongLivedToken(shortLivedToken) {
  try {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: META_CONFIG.clientId,
      client_secret: META_CONFIG.clientSecret,
      fb_exchange_token: shortLivedToken
    });

    const response = await fetch(`${META_CONFIG.baseUrl}/oauth/access_token?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to get long-lived token');
    }

    return data;
  } catch (error) {
    console.error('Error getting long-lived token:', error);
    throw error;
  }
}

/**
 * Verify if access token is still valid
 */
export async function verifyMetaToken(accessToken) {
  try {
    const response = await fetch(`${META_CONFIG.baseUrl}/me?access_token=${accessToken}`);
    return response.ok;
  } catch (error) {
    console.error('Meta token verification failed:', error);
    return false;
  }
}

/**
 * Get Instagram Business Account information
 */
export async function getInstagramAccountInfo(accessToken) {
  try {
    console.log('🔍 Fetching Facebook pages...');
    
    // First get user's Facebook pages (required for Instagram Business API)
    const pagesResponse = await fetch(
      `${META_CONFIG.baseUrl}/me/accounts?access_token=${accessToken}`
    );
    const pagesData = await pagesResponse.json();

    if (!pagesResponse.ok) {
      console.error('❌ Failed to get Facebook pages:', pagesData);
      throw new Error(pagesData.error?.message || 'Failed to get Facebook pages');
    }

    console.log(`✅ Found ${pagesData.data?.length || 0} Facebook page(s):`, pagesData.data?.map(p => ({ id: p.id, name: p.name })));

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('No Facebook pages found. Please create a Facebook Page first.');
    }

    // Find Instagram Business Account connected to a page
    let instagramAccount = null;
    
    for (const page of pagesData.data) {
      try {
        console.log(`🔍 Checking page "${page.name}" (${page.id}) for Instagram connection...`);
        
        // Check for both instagram_business_account and instagram_accounts
        const igResponse = await fetch(
          `${META_CONFIG.baseUrl}/${page.id}?fields=instagram_business_account,instagram_accounts&access_token=${page.access_token}`
        );
        const igData = await igResponse.json();
        
        console.log(`📊 Instagram check result for "${page.name}":`, JSON.stringify(igData, null, 2));
        
        if (igData.instagram_business_account) {
          console.log(`✅ Found Instagram Business Account ID: ${igData.instagram_business_account.id}`);
          
          // Get Instagram account details
          const accountResponse = await fetch(
            `${META_CONFIG.baseUrl}/${igData.instagram_business_account.id}?fields=id,username,name,biography,website,followers_count,media_count,profile_picture_url&access_token=${page.access_token}`
          );
          const accountData = await accountResponse.json();
          
          console.log(`✅ Instagram account details:`, accountData);
          
          instagramAccount = {
            id: accountData.id,
            username: accountData.username,
            name: accountData.name,
            biography: accountData.biography,
            website: accountData.website,
            followersCount: accountData.followers_count,
            mediaCount: accountData.media_count,
            profilePictureUrl: accountData.profile_picture_url,
            pageId: page.id,
            pageAccessToken: page.access_token
          };
          break;
        } else {
          console.log(`⚠️ No Instagram Business Account linked to page "${page.name}"`);
        }
      } catch (error) {
        console.error(`❌ Error checking page ${page.id}:`, error.message);
      }
    }

    if (!instagramAccount) {
      console.error('❌ No Instagram Business Account found on any Facebook page.');
      console.log('💡 Make sure:');
      console.log('   1. Your Instagram account is a Business or Professional account');
      console.log('   2. It is connected to your Facebook page in Instagram settings');
      console.log('   3. The connection is active (not just linked in Facebook settings)');
      throw new Error('No Instagram Business Account found. Please:\n1. Convert your Instagram to a Business/Professional account\n2. In Instagram app: Settings → Account → Linked accounts → Facebook\n3. Make sure the connection shows "Connected" in both Instagram and Facebook');
    }

    return instagramAccount;
  } catch (error) {
    console.error('Error getting Instagram account info:', error);
    throw error;
  }
}

/**
 * Get Facebook Page information
 */
export async function getFacebookPageInfo(accessToken, pageId = null) {
  try {
    const endpoint = pageId 
      ? `${META_CONFIG.baseUrl}/${pageId}?fields=id,name,about,category,fan_count,talking_about_count,picture&access_token=${accessToken}`
      : `${META_CONFIG.baseUrl}/me/accounts?access_token=${accessToken}`;

    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to get Facebook page info');
    }

    if (pageId) {
      return {
        id: data.id,
        name: data.name,
        about: data.about,
        category: data.category,
        fanCount: data.fan_count,
        talkingAboutCount: data.talking_about_count,
        picture: data.picture?.data?.url,
        accessToken: accessToken // Include the page access token
      };
    } else {
      // Return first page if no specific page requested
      const page = data.data[0];
      if (page) {
        const pageInfo = await getFacebookPageInfo(page.access_token, page.id);
        // Make sure to include the page access token
        pageInfo.accessToken = page.access_token;
        return pageInfo;
      }
      throw new Error('No Facebook pages found');
    }
  } catch (error) {
    console.error('Error getting Facebook page info:', error);
    throw error;
  }
}

/**
 * Get Instagram Analytics with Historical Data
 */
export async function getInstagramAnalytics(accessToken, accountId, startDate = null, endDate = null) {
  try {
    // Default to last 30 days
    if (!startDate) {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString().split('T')[0];
    }
    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }

    const analytics = {
      dateRange: { startDate, endDate },
      accountMetrics: {},
      recentMedia: [],
      topMedia: [],
      engagement: {},
      insights: {}
    };

    // Get account insights (requires Instagram Business Account)
    try {
      const insightsResponse = await fetch(
        `${META_CONFIG.baseUrl}/${accountId}/insights?metric=impressions,reach,follower_count,profile_views&period=day&since=${startDate}&until=${endDate}&access_token=${accessToken}`
      );
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        analytics.insights = processInstagramInsights(insightsData.data);
      }
    } catch (error) {
      console.log('Could not fetch Instagram insights:', error.message);
    }

    // Get recent media
    try {
      const mediaResponse = await fetch(
        `${META_CONFIG.baseUrl}/${accountId}/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count&limit=25&access_token=${accessToken}`
      );
      
      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        analytics.recentMedia = mediaData.data.filter(media => {
          const mediaDate = new Date(media.timestamp);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return mediaDate >= start && mediaDate <= end;
        });

        // Get top performing media
        analytics.topMedia = [...analytics.recentMedia]
          .sort((a, b) => (b.like_count + b.comments_count) - (a.like_count + a.comments_count))
          .slice(0, 5);
      }
    } catch (error) {
      console.log('Could not fetch Instagram media:', error.message);
      analytics.recentMedia = [];
      analytics.topMedia = [];
    }

    // Calculate engagement metrics
    if (analytics.recentMedia.length > 0) {
      const totalLikes = analytics.recentMedia.reduce((sum, media) => sum + media.like_count, 0);
      const totalComments = analytics.recentMedia.reduce((sum, media) => sum + media.comments_count, 0);
      const totalEngagement = totalLikes + totalComments;
      
      analytics.engagement = {
        averageLikes: Math.round(totalLikes / analytics.recentMedia.length),
        averageComments: Math.round(totalComments / analytics.recentMedia.length),
        totalEngagement,
        engagementRate: analytics.accountMetrics.followersCount > 0 
          ? (totalEngagement / (analytics.accountMetrics.followersCount * analytics.recentMedia.length) * 100).toFixed(2)
          : 0
      };
    }

    return analytics;
  } catch (error) {
    console.error('Error getting Instagram analytics:', error);
    throw error;
  }
}

/**
 * Get Facebook Page Analytics with Historical Data
 */
export async function getFacebookAnalytics(pageAccessToken, pageId, startDate = null, endDate = null) {
  try {
    // Default to last 30 days
    if (!startDate) {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString().split('T')[0];
    }
    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }

    const analytics = {
      dateRange: { startDate, endDate },
      pageMetrics: {},
      recentPosts: [],
      topPosts: [],
      engagement: {},
      insights: {}
    };

    // Get page insights
    try {
      const insightsResponse = await fetch(
        `${META_CONFIG.baseUrl}/${pageId}/insights?metric=page_impressions,page_reach,page_fan_adds,page_fan_removes,page_views_total&period=day&since=${startDate}&until=${endDate}&access_token=${pageAccessToken}`
      );
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        analytics.insights = processFacebookInsights(insightsData.data);
      }
    } catch (error) {
      console.log('Could not fetch Facebook page insights:', error.message);
    }

    // Get recent posts (fetch all posts, no date limit)
    // Using '/feed' endpoint as per official Facebook Pages API documentation
    // Handle pagination with aggressive rate limit protection
    try {
      let allPosts = [];
      let postsUrl = `${META_CONFIG.baseUrl}/${pageId}/feed?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=100&access_token=${pageAccessToken}`;
      let pageCount = 0;
      const maxPages = 5; // Reduced to 5 pages (500 posts max) to avoid rate limits
      const delayBetweenRequests = 1000; // Increased to 1 second between requests
      
      console.log(`🔍 Fetching Facebook posts from /feed endpoint with pagination (max ${maxPages} pages, ${delayBetweenRequests}ms delay)`);
      
      while (postsUrl && pageCount < maxPages) {
        try {
          const postsResponse = await fetch(postsUrl);
          const postsData = await postsResponse.json();
          
          // Check rate limit headers if available
          const rateLimitHeader = postsResponse.headers.get('x-business-use-case-usage') || postsResponse.headers.get('x-app-usage');
          if (rateLimitHeader) {
            console.log(`📊 Rate Limit Info:`, rateLimitHeader);
          }
          
          console.log(`📊 Facebook API Page ${pageCount + 1} Status: ${postsResponse.status}`);
          
          if (postsResponse.ok && postsData.data && Array.isArray(postsData.data)) {
            console.log(`📊 Fetched ${postsData.data.length} posts from page ${pageCount + 1}`);
            allPosts = allPosts.concat(postsData.data);
            pageCount++;
            
            // Check if there's a next page
            if (postsData.paging && postsData.paging.next && pageCount < maxPages) {
              postsUrl = postsData.paging.next;
              // Add delay to avoid rate limiting
              console.log(`⏳ Waiting ${delayBetweenRequests}ms before next request...`);
              await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
            } else {
              // No more pages or reached max pages
              if (pageCount >= maxPages) {
                console.log(`✅ Reached max pages limit (${maxPages})`);
              }
              break;
            }
          } else if (postsResponse.status === 500 || postsResponse.status === 400 || postsData.error) {
            // Rate limit or server error - use what we have so far
            console.warn(`⚠️ Facebook API error on page ${pageCount + 1}:`, postsData.error?.message || 'Server error');
            console.log(`📦 Successfully fetched ${allPosts.length} posts before hitting rate limit`);
            console.log(`💡 Tip: The API has a rate limit. Consider waiting before fetching more data.`);
            break;
          } else {
            console.error('❌ Facebook posts API error:', postsData);
            break;
          }
        } catch (fetchError) {
          console.error(`❌ Network error fetching page ${pageCount + 1}:`, fetchError.message);
          break;
        }
      }
      
      console.log(`✅ Total posts fetched: ${allPosts.length} from ${pageCount + 1} page(s)`);
      
      if (allPosts.length > 0) {
        // Use all fetched posts
        analytics.recentPosts = allPosts;

        // Get top performing posts
        analytics.topPosts = [...analytics.recentPosts]
          .sort((a, b) => {
            const aEngagement = (a.likes?.summary?.total_count || 0) + (a.comments?.summary?.total_count || 0) + (a.shares?.count || 0);
            const bEngagement = (b.likes?.summary?.total_count || 0) + (b.comments?.summary?.total_count || 0) + (b.shares?.count || 0);
            return bEngagement - aEngagement;
          })
          .slice(0, 10); // Get top 10 posts
      } else {
        analytics.recentPosts = [];
        analytics.topPosts = [];
      }
    } catch (error) {
      console.error('❌ Could not fetch Facebook posts:', error.message, error.stack);
      analytics.recentPosts = [];
      analytics.topPosts = [];
    }

    // Calculate engagement metrics
    if (analytics.recentPosts.length > 0) {
      const totalLikes = analytics.recentPosts.reduce((sum, post) => sum + (post.likes?.summary?.total_count || 0), 0);
      const totalComments = analytics.recentPosts.reduce((sum, post) => sum + (post.comments?.summary?.total_count || 0), 0);
      const totalShares = analytics.recentPosts.reduce((sum, post) => sum + (post.shares?.count || 0), 0);
      const totalEngagement = totalLikes + totalComments + totalShares;
      
      console.log('📊 Engagement calculation:', {
        totalLikes,
        totalComments,
        totalShares,
        totalEngagement,
        postCount: analytics.recentPosts.length
      });

      const averageEngagementPerPost = totalEngagement / analytics.recentPosts.length;
      
      // Get page fan count for engagement rate calculation
      let fanCount = 0;
      try {
        const pageInfoUrl = `${META_CONFIG.baseUrl}/${pageId}?fields=fan_count,followers_count&access_token=${pageAccessToken}`;
        const pageInfoResponse = await fetch(pageInfoUrl);
        const pageInfoData = await pageInfoResponse.json();
        fanCount = pageInfoData.fan_count || pageInfoData.followers_count || 0;
        console.log(`📊 Fan count for engagement rate: ${fanCount}`);
      } catch (e) {
        console.log('Could not fetch fan count for engagement rate:', e.message);
      }

      // Calculate engagement rate: (total engagement / total reach or fans) * 100
      let engagementRate = '0.00';
      
      if (fanCount > 0 && totalEngagement > 0) {
        // Use total engagement / followers * 100 (like industry standard)
        engagementRate = ((totalEngagement / fanCount) * 100).toFixed(2);
        console.log(`📊 Engagement rate (total/fans): ${totalEngagement}/${fanCount}*100 = ${engagementRate}%`);
      } else if (analytics.recentPosts.length > 0 && totalEngagement > 0) {
        // Fallback: average engagement per post as percentage of post count
        engagementRate = ((averageEngagementPerPost / 100) * 100).toFixed(2);
        console.log(`📊 Engagement rate (fallback): ${engagementRate}%`);
      }
      
      analytics.engagement = {
        averageLikes: Math.round(totalLikes / analytics.recentPosts.length),
        averageComments: Math.round(totalComments / analytics.recentPosts.length),
        averageShares: Math.round(totalShares / analytics.recentPosts.length),
        totalEngagement,
        engagementRate
      };
      
      console.log('📊 Final engagement object:', analytics.engagement);
    }

    return analytics;
  } catch (error) {
    console.error('Error getting Facebook analytics:', error);
    throw error;
  }
}

/**
 * Process Instagram Insights data
 */
function processInstagramInsights(insightsData) {
  const insights = {};
  
  insightsData.forEach(insight => {
    insights[insight.name] = {
      title: insight.title,
      description: insight.description,
      values: insight.values,
      period: insight.period
    };
  });
  
  return insights;
}

/**
 * Process Facebook Insights data
 */
function processFacebookInsights(insightsData) {
  const insights = {};
  
  insightsData.forEach(insight => {
    insights[insight.name] = {
      title: insight.title,
      description: insight.description,
      values: insight.values,
      period: insight.period
    };
  });
  
  return insights;
}

/**
 * Refresh access token (Meta tokens are long-lived, 60 days)
 */
export async function refreshMetaToken(accessToken) {
  try {
    // For Meta, we refresh the long-lived token before it expires
    return await getLongLivedToken(accessToken);
  } catch (error) {
    console.error('Error refreshing Meta token:', error);
    throw error;
  }
}

/**
 * Get Facebook Page Performance Metrics
 * Fetches detailed performance insights like impressions, reach, engagement, views
 */
export async function getFacebookPerformanceMetrics(pageAccessToken, pageId, since, until) {
  try {
    // Default to last 28 days if no date range provided
    const endDate = until || new Date();
    const startDate = since || new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    
    const sinceTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const untilTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    console.log('📊 Fetching page-level performance metrics...');

    const performance = {
      dateRange: {
        start: new Date(sinceTimestamp * 1000).toISOString().split('T')[0],
        end: new Date(untilTimestamp * 1000).toISOString().split('T')[0]
      },
      metrics: {}
    };

    // Try different metric approaches
    const metricsToTry = [
      { name: 'page_impressions', period: 'day' },
      { name: 'page_impressions', period: 'week' },
      { name: 'page_impressions', period: 'days_28' },
      { name: 'page_impressions_unique', period: 'days_28' },
      { name: 'page_post_engagements', period: 'days_28' },
      { name: 'page_views_total', period: 'days_28' },
      { name: 'page_content_activity', period: 'day' },
      { name: 'page_consumptions', period: 'days_28' },
      { name: 'page_places_checkin_total', period: 'day' }
    ];

    for (const metric of metricsToTry) {
      // Skip if we already have this metric
      if (performance.metrics[metric.name]) continue;
      
      try {
        let metricUrl;
        if (metric.period === 'day' || metric.period === 'week') {
          metricUrl = `${META_CONFIG.baseUrl}/${pageId}/insights/${metric.name}?since=${sinceTimestamp}&until=${untilTimestamp}&period=${metric.period}&access_token=${pageAccessToken}`;
        } else {
          metricUrl = `${META_CONFIG.baseUrl}/${pageId}/insights/${metric.name}?period=${metric.period}&access_token=${pageAccessToken}`;
        }
        
        const response = await fetch(metricUrl);
        const data = await response.json();

        if (response.ok && data.data && data.data.length > 0) {
          const metricData = data.data[0];
          let totalValue;
          
          if (metric.period === 'days_28') {
            // Get the most recent value for days_28 period
            totalValue = metricData.values[metricData.values.length - 1]?.value || 0;
          } else {
            // Sum up daily/weekly values
            totalValue = metricData.values.reduce((sum, day) => sum + (day.value || 0), 0);
          }
          
          performance.metrics[metric.name] = {
            total: totalValue,
            period: metric.period,
            description: metricData.description
          };
          
          console.log(`✅ ${metric.name} (${metric.period}): ${totalValue}`);
        } else {
          console.log(`⚠️ ${metric.name} (${metric.period}) not available:`, data.error?.message || 'No data');
        }
      } catch (error) {
        console.log(`❌ ${metric.name} failed:`, error.message);
      }
    }

    // Get followers count
    try {
      const fansUrl = `${META_CONFIG.baseUrl}/${pageId}?fields=followers_count,fan_count&access_token=${pageAccessToken}`;
      const response = await fetch(fansUrl);
      const data = await response.json();
      
      if (response.ok) {
        performance.metrics.followers = {
          total: data.followers_count || data.fan_count || 0
        };
        console.log(`✅ followers: ${performance.metrics.followers.total}`);
      }
    } catch (e) {}

    // Try to get total content views from published_posts insights
    try {
      console.log('📹 Fetching content/post insights...');
      const postsUrl = `${META_CONFIG.baseUrl}/${pageId}/published_posts?fields=id,insights.metric(post_impressions,post_impressions_unique)&limit=50&access_token=${pageAccessToken}`;
      const response = await fetch(postsUrl);
      const data = await response.json();
      
      if (response.ok && data.data) {
        let totalPostImpressions = 0;
        let totalPostReach = 0;
        
        data.data.forEach(post => {
          if (post.insights && post.insights.data) {
            post.insights.data.forEach(insight => {
              if (insight.name === 'post_impressions') {
                totalPostImpressions += insight.values[0]?.value || 0;
              }
              if (insight.name === 'post_impressions_unique') {
                totalPostReach += insight.values[0]?.value || 0;
              }
            });
          }
        });
        
        performance.metrics.content_impressions = { total: totalPostImpressions };
        performance.metrics.content_reach = { total: totalPostReach };
        console.log(`✅ content_impressions (from ${data.data.length} posts): ${totalPostImpressions}`);
        console.log(`✅ content_reach: ${totalPostReach}`);
      }
    } catch (e) {
      console.log('⚠️ Content insights not available:', e.message);
    }

    // Calculate summary - use content metrics if page metrics aren't available
    const impressions = performance.metrics.page_impressions?.total || performance.metrics.content_impressions?.total || 0;
    const reach = performance.metrics.page_impressions_unique?.total || performance.metrics.content_reach?.total || 0;
    const engagements = performance.metrics.page_post_engagements?.total || 0;
    const pageViews = performance.metrics.page_views_total?.total || 0;
    const consumptions = performance.metrics.page_consumptions?.total || 0;
    const followers = performance.metrics.followers?.total || 0;

    // Calculate engagement rate - use reach, impressions, or followers (in priority order)
    let engagementRate = 0;
    if (reach > 0) {
      engagementRate = ((engagements / reach) * 100).toFixed(2);
    } else if (impressions > 0) {
      engagementRate = ((engagements / impressions) * 100).toFixed(2);
    } else if (followers > 0) {
      engagementRate = ((engagements / followers) * 100).toFixed(2);
    }

    performance.summary = {
      totalImpressions: impressions,
      totalReach: reach,
      totalEngagements: engagements,
      totalPageViews: pageViews,
      totalConsumptions: consumptions,
      totalFollowers: followers,
      engagementRate: engagementRate
    };

    console.log('📈 Performance Summary:', performance.summary);

    return performance;
  } catch (error) {
    console.error('Error fetching Facebook performance metrics:', error);
    throw error;
  }
}

/**
 * Get Facebook Page Demographics Data
 * Fetches audience demographics: location data
 */
export async function getFacebookDemographics(pageAccessToken, pageId) {
  try {
    console.log('👥 Fetching Facebook demographics...');

    const demographics = {
      cities: {},
      countries: {},
      followers: 0,
      errors: []
    };

    // Try different metrics individually with different periods
    const metricsToTry = [
      { name: 'page_fans_city', period: 'lifetime' },
      { name: 'page_fans_city', period: 'day' },
      { name: 'page_fans_country', period: 'lifetime' },
      { name: 'page_fans_country', period: 'day' }
    ];

    for (const metric of metricsToTry) {
      try {
        const url = `${META_CONFIG.baseUrl}/${pageId}/insights/${metric.name}?period=${metric.period}&access_token=${pageAccessToken}`;
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.data && data.data.length > 0) {
          const latestValue = data.data[0].values[data.data[0].values.length - 1]?.value || {};
          
          if (metric.name === 'page_fans_city' && Object.keys(demographics.cities).length === 0) {
            demographics.cities = Object.entries(latestValue)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .reduce((obj, [city, count]) => {
                obj[city] = count;
                return obj;
              }, {});
            console.log(`✅ ${metric.name} (${metric.period}): ${Object.keys(demographics.cities).length} cities`);
          }
          
          if (metric.name === 'page_fans_country' && Object.keys(demographics.countries).length === 0) {
            demographics.countries = Object.entries(latestValue)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .reduce((obj, [country, count]) => {
                obj[country] = count;
                return obj;
              }, {});
            console.log(`✅ ${metric.name} (${metric.period}): ${Object.keys(demographics.countries).length} countries`);
          }
        } else {
          console.log(`⚠️ ${metric.name} (${metric.period}) not available`);
        }
      } catch (e) {
        console.log(`❌ ${metric.name} failed`);
      }
    }

    // Get followers count as fallback data
    try {
      const pageUrl = `${META_CONFIG.baseUrl}/${pageId}?fields=followers_count,fan_count,location,name&access_token=${pageAccessToken}`;
      const response = await fetch(pageUrl);
      const data = await response.json();
      
      if (response.ok) {
        demographics.followers = data.followers_count || data.fan_count || 0;
        demographics.pageName = data.name;
        demographics.pageLocation = data.location;
        console.log(`✅ Page followers: ${demographics.followers}`);
      }
    } catch (e) {}

    // If no demographics data, create sample based on page info
    if (Object.keys(demographics.cities).length === 0 && Object.keys(demographics.countries).length === 0) {
      console.log('⚠️ Demographics not available via API. This may require additional permissions.');
      demographics.message = 'Demographics data requires read_insights permission and may not be available for all pages.';
    }

    return demographics;
  } catch (error) {
    console.error('Error fetching Facebook demographics:', error);
    throw error;
  }
}

/**
 * Get Instagram Performance Metrics
 */
export async function getInstagramPerformanceMetrics(accessToken, instagramAccountId, since, until) {
  try {
    const endDate = until || new Date();
    const startDate = since || new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    
    const sinceTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const untilTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    // Instagram metrics available
    const metricsToFetch = [
      'impressions',
      'reach',
      'profile_views',
      'follower_count'
    ];

    const metricsParam = metricsToFetch.join(',');
    const insightsUrl = `${META_CONFIG.baseUrl}/${instagramAccountId}/insights?metric=${metricsParam}&since=${sinceTimestamp}&until=${untilTimestamp}&period=day&access_token=${accessToken}`;

    const response = await fetch(insightsUrl);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch Instagram insights');
    }

    const performance = {
      dateRange: {
        start: new Date(sinceTimestamp * 1000).toISOString().split('T')[0],
        end: new Date(untilTimestamp * 1000).toISOString().split('T')[0]
      },
      metrics: {}
    };

    data.data.forEach(metric => {
      const totalValue = metric.values.reduce((sum, day) => sum + (day.value || 0), 0);
      const avgValue = totalValue / metric.values.length;
      
      performance.metrics[metric.name] = {
        total: totalValue,
        average: Math.round(avgValue),
        trend: metric.values.map(v => ({ date: v.end_time, value: v.value || 0 }))
      };
    });

    return performance;
  } catch (error) {
    console.error('Error fetching Instagram performance:', error);
    throw error;
  }
}

/**
 * Get Instagram Demographics
 */
export async function getInstagramDemographics(accessToken, instagramAccountId) {
  try {
    // Instagram demographic metrics
    const demographicMetrics = [
      'audience_gender_age',
      'audience_city',
      'audience_country'
    ];

    const metricsParam = demographicMetrics.join(',');
    const insightsUrl = `${META_CONFIG.baseUrl}/${instagramAccountId}/insights?metric=${metricsParam}&period=lifetime&access_token=${accessToken}`;

    const response = await fetch(insightsUrl);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch Instagram demographics');
    }

    const demographics = {
      ageGender: {},
      cities: {},
      countries: {}
    };

    data.data.forEach(metric => {
      const latestValue = metric.values[metric.values.length - 1]?.value || {};

      switch (metric.name) {
        case 'audience_gender_age':
          demographics.ageGender = latestValue;
          demographics.ageGroups = {};
          demographics.gender = { M: 0, F: 0, U: 0 };
          
          Object.keys(latestValue).forEach(key => {
            const [gender, ageRange] = key.split('.');
            if (ageRange) {
              demographics.ageGroups[ageRange] = (demographics.ageGroups[ageRange] || 0) + latestValue[key];
              demographics.gender[gender] = (demographics.gender[gender] || 0) + latestValue[key];
            }
          });
          break;

        case 'audience_city':
          demographics.cities = latestValue;
          break;

        case 'audience_country':
          demographics.countries = latestValue;
          break;
      }
    });

    return demographics;
  } catch (error) {
    console.error('Error fetching Instagram demographics:', error);
    throw error;
  }
}
