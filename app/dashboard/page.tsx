'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../utils/auth';
import Sidebar from '../../components/Sidebar';

interface PlatformSummary {
  platform: string;
  icon: string;
  color: string;
  followers: number;
  engagement: number;
  posts: number;
  connected: boolean;
}

interface ContentItem {
  id: string;
  platform: string;
  platformColor: string;
  title: string;
  type: 'video' | 'post';
  views: number;
  likes: number;
  comments: number;
  engagement: number;
  publishedAt: string;
  thumbnail?: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [platformSummaries, setPlatformSummaries] = useState<PlatformSummary[]>([]);
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [postingActivity, setPostingActivity] = useState<{date: string, count: number, platform: string}[]>([]);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
      fetchAllPlatformData(currentUser._id);
    }
  }, [router]);

  const fetchAllPlatformData = async (userId: string) => {
    setLoading(true);
    const summaries: PlatformSummary[] = [];
    const allContentItems: ContentItem[] = [];
    const activityData: {date: string, count: number, platform: string}[] = [];

    try {
      // Check connected platforms
      const accountsResponse = await fetch(`/api/social-accounts?userId=${userId}`);
      const accountsData = await accountsResponse.json();
      
      const connectedPlatforms = accountsData.accounts?.map((acc: any) => 
        acc.SMType_ID.SMType_Description.toLowerCase()
      ) || [];

      console.log('🔍 Dashboard - Connected platforms from API:', connectedPlatforms);
      console.log('🔍 Dashboard - Full accounts data:', accountsData);

      // YouTube
      if (connectedPlatforms.includes('youtube')) {
        try {
          console.log('📺 Fetching YouTube analytics for userId:', userId);
          const response = await fetch('/api/analytics/youtube', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, forceRefresh: false }),
          });
          const data = await response.json();
          console.log('📺 YouTube API response:', { ok: response.ok, data });
          
          if (response.ok && data.analytics) {
            summaries.push({
              platform: 'YouTube',
              icon: 'fab fa-youtube',
              color: '#FF0000',
              followers: data.analytics.channelMetrics?.subscriberCount || 0,
              engagement: parseFloat(data.analytics.engagement?.engagementRate || '0'),
              posts: data.analytics.channelMetrics?.totalVideoCount || 0,
              connected: true
            });
            console.log('✅ YouTube summary added:', summaries[summaries.length - 1]);
            
            // Store YouTube videos for content list
            if (data.analytics.topVideos) {
              const youtubeContent: ContentItem[] = data.analytics.topVideos.map((video: any) => ({
                id: video.videoId,
                platform: 'YouTube',
                platformColor: '#FF0000',
                title: video.title || 'Untitled Video',
                type: 'video' as const,
                views: video.viewCount || 0,
                likes: video.likeCount || 0,
                comments: video.commentCount || 0,
                engagement: video.viewCount ? ((video.likeCount + video.commentCount) / video.viewCount * 100) : 0,
                publishedAt: video.publishedAt,
                thumbnail: video.thumbnails?.default?.url
              }));
              allContentItems.push(...youtubeContent);
              
              // Store posting activity
              data.analytics.topVideos.forEach((video: any) => {
                if (video.publishedAt) {
                  activityData.push({
                    date: video.publishedAt.split('T')[0],
                    count: 1,
                    platform: 'YouTube'
                  });
                }
              });
            }
          } else {
            console.error('❌ YouTube API failed:', data.error || 'Unknown error');
          }
        } catch (err) {
          console.error('❌ Error fetching YouTube data:', err);
        }
      }

      // Facebook
      if (connectedPlatforms.includes('facebook')) {
        try {
          const response = await fetch('/api/analytics/facebook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, forceRefresh: false }),
          });
          const data = await response.json();
          
          if (response.ok && data.analytics) {
            summaries.push({
              platform: 'Facebook',
              icon: 'fab fa-facebook',
              color: '#1877F2',
              followers: data.analytics.pageMetrics?.fanCount || 0,
              engagement: data.analytics.pageMetrics?.talkingAboutCount || 0,
              posts: data.analytics.posts?.length || 0,
              connected: true
            });
            
            // Store Facebook posts for content list
            if (data.analytics.posts) {
              const facebookContent: ContentItem[] = data.analytics.posts.map((post: any) => {
                const insights = post.insights?.data || [];
                const reachInsight = insights.find((i: any) => i.name === 'post_impressions_unique');
                const engagementInsight = insights.find((i: any) => i.name === 'post_engaged_users');
                const reach = reachInsight?.values?.[0]?.value || 0;
                const engaged = engagementInsight?.values?.[0]?.value || 0;
                
                return {
                  id: post.id,
                  platform: 'Facebook',
                  platformColor: '#1877F2',
                  title: post.message || post.story || 'Facebook Post',
                  type: 'post' as const,
                  views: reach,
                  likes: post.likes?.summary?.total_count || 0,
                  comments: post.comments?.summary?.total_count || 0,
                  engagement: reach ? (engaged / reach * 100) : 0,
                  publishedAt: post.created_time
                };
              });
              allContentItems.push(...facebookContent);
              
              // Store posting activity
              data.analytics.posts.forEach((post: any) => {
                if (post.created_time) {
                  activityData.push({
                    date: post.created_time.split('T')[0],
                    count: 1,
                    platform: 'Facebook'
                  });
                }
              });
            }
          }
        } catch (err) {
          console.error('Error fetching Facebook data:', err);
        }
      }

      // Instagram
      if (connectedPlatforms.includes('instagram')) {
        try {
          const response = await fetch('/api/analytics/instagram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, forceRefresh: false }),
          });
          const data = await response.json();
          
          if (response.ok && data.analytics) {
            summaries.push({
              platform: 'Instagram',
              icon: 'fab fa-instagram',
              color: '#E4405F',
              followers: data.analytics.accountMetrics?.followersCount || 0,
              engagement: parseFloat(data.analytics.engagementRate || '0'),
              posts: data.analytics.accountMetrics?.mediaCount || 0,
              connected: true
            });
          }
        } catch (err) {
          console.error('Error fetching Instagram data:', err);
        }
      }

      setPlatformSummaries(summaries);
      
      // Sort content by engagement and set state
      allContentItems.sort((a, b) => b.engagement - a.engagement);
      setAllContent(allContentItems);
      setPostingActivity(activityData);
    } catch (error) {
      console.error('Error fetching platform data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalFollowers = () => {
    return platformSummaries.reduce((sum, platform) => sum + platform.followers, 0);
  };

  const getTotalPosts = () => {
    return platformSummaries.reduce((sum, platform) => sum + platform.posts, 0);
  };

  const getAverageEngagement = () => {
    if (platformSummaries.length === 0) return 0;
    const total = platformSummaries.reduce((sum, platform) => sum + platform.engagement, 0);
    return (total / platformSummaries.length).toFixed(2);
  };

  return (
    <div style={{display: 'flex', minHeight: '100vh', background: '#F9FAFB'}}>
      <Sidebar activePage="dashboard" />
      
      <main className="main-content" style={{background: '#F9FAFB', overflow: 'hidden'}}>
        {/* Modern Gradient Header */}
        <div style={{



          background: 'linear-gradient(135deg, rgb(42, 71, 89) 0%, rgb(30, 58, 74) 50%, rgb(42, 71, 89) 100%)',
          padding: '2.5rem 2rem',
          borderRadius: '16px',
          marginBottom: '2rem',
          color: 'white',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                color: 'rgba(255,255,255,0.9)'
              }}>
                <i className="fas fa-chart-line"></i>
              </div>
              <div>
                <h1 style={{fontSize: '2.2rem', fontWeight: '700', margin: 0, letterSpacing: '-0.5px'}}>
                  Dashboard
                </h1>
                <p style={{fontSize: '1rem', opacity: 0.9, margin: '0.5rem 0 0 0'}}>
                  Welcome back, {user?.username || 'User'}! Here's your social media overview.
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{textAlign: 'center', padding: '3rem'}}>
            <div style={{fontSize: '3rem', marginBottom: '1rem', color: '#667eea'}}>
              <i className="fas fa-spinner fa-spin"></i>
            </div>
            <p style={{color: '#6B7280', fontSize: '1.1rem'}}>Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <OverviewCard
                title="Total Followers"
                value={getTotalFollowers().toLocaleString()}
                icon="fas fa-users"
                color="#667eea"
                subtitle={`Across ${platformSummaries.length} platform${platformSummaries.length !== 1 ? 's' : ''}`}
              />
              <OverviewCard
                title="Total Posts"
                value={getTotalPosts().toLocaleString()}
                icon="fas fa-file-alt"
                color="#764ba2"
                subtitle="All platforms"
              />
              <OverviewCard
                title="Avg Engagement"
                value={getAverageEngagement() + '%'}
                icon="fas fa-comments"
                color="#F79B72"
                subtitle="Engagement rate"
              />
              <OverviewCard
                title="Connected Platforms"
                value={platformSummaries.length.toString()}
                icon="fas fa-link"
                color="#2C3E50"
                subtitle="Active connections"
              />
            </div>

            {/* Platform Summaries */}
            {platformSummaries.length > 0 ? (
              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: '2rem'
              }}>
                <h2 style={{margin: '0 0 1.5rem 0', color: '#2A4759', fontSize: '1.3rem', fontWeight: '600'}}>
                  Platform Overview
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem'
                }}>
                  {platformSummaries.map((platform) => (
                    <PlatformCard key={platform.platform} platform={platform} />
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div style={{fontSize: '4rem', marginBottom: '1rem', color: '#667eea'}}>
                  <i className="fas fa-link"></i>
                </div>
                <h3 style={{color: '#2A4759', marginBottom: '0.5rem'}}>No Platforms Connected</h3>
                <p style={{color: '#6B7280', marginBottom: '1.5rem'}}>
                  Connect your social media accounts to start tracking your performance.
                </p>
                <button
                  onClick={() => router.push('/connect')}
                  style={{
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  Connect Accounts
                </button>
              </div>
            )}

            {/* Charts Section */}
            {platformSummaries.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                {/* Followers Chart */}
                <div style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  minHeight: '350px'
                }}>
                  <h3 style={{
                    margin: '0 0 1rem 0',
                    color: '#2A4759',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="fas fa-users" style={{ color: '#F79B72' }}></i>
                    Followers by Platform
                  </h3>
                  <FollowersChart platforms={platformSummaries} />
                </div>

                {/* Engagement Chart */}
                <div style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  minHeight: '350px'
                }}>
                  <h3 style={{
                    margin: '0 0 1rem 0',
                    color: '#2A4759',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="fas fa-chart-line" style={{ color: '#F79B72' }}></i>
                    Engagement Rate
                  </h3>
                  <EngagementChart platforms={platformSummaries} />
                </div>
              </div>
            )}

            {/* Data Table */}
            {platformSummaries.length > 0 && (
              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: '2rem',
                overflowX: 'auto'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  color: '#2A4759',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <i className="fas fa-table" style={{ color: '#F79B72' }}></i>
                  Platform Performance
                </h3>
                <PlatformTable platforms={platformSummaries} />
              </div>
            )}

            {/* NEW SECTIONS */}
            
            {/* Top Performing Content */}
            {allContent.length > 0 && (
              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: '2rem',
                overflowX: 'auto'
              }}>
                <h3 style={{
                  margin: '0 0 1.5rem 0',
                  color: '#2A4759',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <i className="fas fa-trophy" style={{ color: '#F79B72' }}></i>
                  Top Performing Content
                </h3>
                <TopPerformingContent content={allContent.slice(0, 5)} />
              </div>
            )}

            {/* Platform Comparison Grid */}
            {platformSummaries.length > 1 && (
              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: '2rem',
                overflowX: 'auto'
              }}>
                <h3 style={{
                  margin: '0 0 1.5rem 0',
                  color: '#2A4759',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <i className="fas fa-th-large" style={{ color: '#F79B72' }}></i>
                  Platform Comparison
                </h3>
                <PlatformComparisonGrid platforms={platformSummaries} />
              </div>
            )}

            {/* Engagement Breakdown & Content Performance Timeline */}
            {allContent.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                {/* Engagement Breakdown */}
                <div style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  minHeight: '350px'
                }}>
                  <h3 style={{
                    margin: '0 0 1rem 0',
                    color: '#2A4759',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="fas fa-heart" style={{ color: '#F79B72' }}></i>
                    Engagement Breakdown
                  </h3>
                  <EngagementBreakdownChart content={allContent} />
                </div>

                {/* Content Performance Timeline */}
                <div style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  minHeight: '350px'
                }}>
                  <h3 style={{
                    margin: '0 0 1rem 0',
                    color: '#2A4759',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="fas fa-chart-area" style={{ color: '#F79B72' }}></i>
                    Content Performance Timeline
                  </h3>
                  <ContentPerformanceTimeline content={allContent} />
                </div>
              </div>
            )}

            {/* Recent Activity Feed */}
            {allContent.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '1.5rem',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                marginBottom: '2rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{
                    margin: 0,
                    color: '#2A4759',
                    fontSize: '1.3rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontWeight: '700'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className="fas fa-stream" style={{ color: 'white', fontSize: '1rem' }}></i>
                    </div>
                    Recent Activity
                  </h3>
                  <span style={{
                    fontSize: '0.85rem',
                    color: '#6B7280',
                    background: '#f3f4f6',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontWeight: '500'
                  }}>
                    Last {Math.min(allContent.length, 6)} items
                  </span>
                </div>
                <RecentActivityFeed content={allContent.sort((a, b) => 
                  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
                ).slice(0, 6)} />
              </div>
            )}

            {/* Quick Actions */}
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{margin: '0 0 1.5rem 0', color: '#2A4759', fontSize: '1.5rem'}}>
                Quick Actions
              </h2>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
                <ActionButton
                  label="View Analytics"
                  icon="fas fa-chart-bar"
                  onClick={() => router.push('/analytics')}
                  color="#667eea"
                />
                <ActionButton
                  label="Generate Report"
                  icon="fas fa-file-alt"
                  onClick={() => router.push('/reports')}
                  color="#764ba2"
                />
                <ActionButton
                  label="Connect More"
                  icon="fas fa-link"
                  onClick={() => router.push('/connect')}
                  color="#F79B72"
                />
                <ActionButton
                  label="Settings"
                  icon="fas fa-cog"
                  onClick={() => router.push('/settings')}
                  color="#2C3E50"
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Overview Card Component
function OverviewCard({ title, value, icon, color, subtitle }: {
  title: string;
  value: string;
  icon: string;
  color: string;
  subtitle: string;
}) {
  return (
    <div style={{
      background: 'white',
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderTop: `4px solid ${color}`,
      transition: 'all 0.2s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    }}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem'}}>
        <span style={{fontSize: '0.9rem', color: '#6B7280', fontWeight: '600'}}>{title}</span>
        <i className={icon} style={{fontSize: '2rem', color: color}}></i>
      </div>
      <div style={{fontSize: '2.5rem', fontWeight: '700', color: '#1F2937', marginBottom: '0.25rem'}}>
        {value}
      </div>
      <div style={{fontSize: '0.85rem', color: '#9CA3AF'}}>{subtitle}</div>
    </div>
  );
}

// Platform Card Component
function PlatformCard({ platform }: { platform: PlatformSummary }) {
  return (
    <div style={{
      padding: '1.5rem',
      border: `2px solid ${platform.color}20`,
      borderRadius: '12px',
      background: `${platform.color}05`,
      transition: 'all 0.2s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 4px 12px ${platform.color}30`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}>
      <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem'}}>
        <div style={{
          width: '40px',
          height: '40px',
          background: platform.color,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          color: 'white'
        }}>
          <i className={platform.icon}></i>
        </div>
        <h3 style={{margin: 0, color: '#1F2937', fontSize: '1.2rem'}}>{platform.platform}</h3>
      </div>
      
      <div style={{display: 'grid', gap: '0.75rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <span style={{color: '#6B7280', fontSize: '0.9rem'}}>Followers</span>
          <span style={{color: '#1F2937', fontWeight: '600', fontSize: '1.1rem'}}>
            {platform.followers.toLocaleString()}
          </span>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <span style={{color: '#6B7280', fontSize: '0.9rem'}}>Posts</span>
          <span style={{color: '#1F2937', fontWeight: '600', fontSize: '1.1rem'}}>
            {platform.posts.toLocaleString()}
          </span>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <span style={{color: '#6B7280', fontSize: '0.9rem'}}>Engagement</span>
          <span style={{color: platform.color, fontWeight: '700', fontSize: '1.1rem'}}>
            {platform.engagement.toLocaleString()}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Action Button Component
function ActionButton({ label, icon, onClick, color }: {
  label: string;
  icon: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '1rem',
        background: 'white',
        border: `2px solid ${color}20`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = color;
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.color = 'white';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'white';
        e.currentTarget.style.borderColor = `${color}20`;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.color = '#1F2937';
      }}
    >
      <i className={icon} style={{fontSize: '2rem'}}></i>
      <span style={{fontWeight: '600', fontSize: '0.95rem'}}>{label}</span>
    </button>
  );
}

// Chart Components
function FollowersChart({ platforms }: { platforms: PlatformSummary[] }) {
  useEffect(() => {
    const ctx = document.getElementById('followersChart') as HTMLCanvasElement;
    if (!ctx) return;

    // @ts-ignore
    if (window.followersChartInstance) {
      // @ts-ignore
      window.followersChartInstance.destroy();
    }

    import('chart.js/auto').then((ChartJS) => {
      // @ts-ignore
      window.followersChartInstance = new ChartJS.default(ctx, {
        type: 'bar',
        data: {
          labels: platforms.map(p => p.platform),
          datasets: [{
            label: 'Followers',
            data: platforms.map(p => p.followers),
            backgroundColor: platforms.map(p => p.color),
            borderColor: platforms.map(p => p.color),
            borderWidth: 2,
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: '#2A4759',
              padding: 12,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              callbacks: {
                label: (context: any) => {
                  return `Followers: ${context.parsed.y.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value: any) => {
                  if (value >= 1000000) return (value / 1000000) + 'M';
                  if (value >= 1000) return (value / 1000) + 'K';
                  return value;
                }
              },
              grid: {
                color: '#f0f0f0'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    });

    return () => {
      // @ts-ignore
      if (window.followersChartInstance) {
        // @ts-ignore
        window.followersChartInstance.destroy();
      }
    };
  }, [platforms]);

  return <canvas id="followersChart" style={{ maxHeight: '300px' }}></canvas>;
}

function EngagementChart({ platforms }: { platforms: PlatformSummary[] }) {
  useEffect(() => {
    const ctx = document.getElementById('engagementChart') as HTMLCanvasElement;
    if (!ctx) return;

    // @ts-ignore
    if (window.engagementChartInstance) {
      // @ts-ignore
      window.engagementChartInstance.destroy();
    }

    import('chart.js/auto').then((ChartJS) => {
      // @ts-ignore
      window.engagementChartInstance = new ChartJS.default(ctx, {
        type: 'doughnut',
        data: {
          labels: platforms.map(p => p.platform),
          datasets: [{
            label: 'Engagement Rate',
            data: platforms.map(p => p.engagement),
            backgroundColor: platforms.map(p => p.color),
            borderColor: '#fff',
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 15,
                font: { size: 12 },
                usePointStyle: true
              }
            },
            tooltip: {
              backgroundColor: '#2A4759',
              padding: 12,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              callbacks: {
                label: (context: any) => {
                  return `${context.label}: ${context.parsed}%`;
                }
              }
            }
          }
        }
      });
    });

    return () => {
      // @ts-ignore
      if (window.engagementChartInstance) {
        // @ts-ignore
        window.engagementChartInstance.destroy();
      }
    };
  }, [platforms]);

  return <canvas id="engagementChart" style={{ maxHeight: '300px' }}></canvas>;
}

function PlatformTable({ platforms }: { platforms: PlatformSummary[] }) {
  return (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse'
    }}>
      <thead>
        <tr style={{
          background: 'linear-gradient(135deg, #2A4759 0%, #1e3a52 100%)',
          color: 'white'
        }}>
          <th style={{ padding: '1rem', textAlign: 'left', borderRadius: '8px 0 0 0' }}>
            Platform
          </th>
          <th style={{ padding: '1rem', textAlign: 'right' }}>
            Followers
          </th>
          <th style={{ padding: '1rem', textAlign: 'right' }}>
            Posts
          </th>
          <th style={{ padding: '1rem', textAlign: 'right', borderRadius: '0 8px 0 0' }}>
            Engagement
          </th>
        </tr>
      </thead>
      <tbody>
        {platforms.map((platform, index) => (
          <tr key={platform.platform} style={{
            borderBottom: index < platforms.length - 1 ? '1px solid #e5e7eb' : 'none',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
          }}>
            <td style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: platform.color,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1rem'
                }}>
                  <i className={platform.icon}></i>
                </div>
                <span style={{ fontWeight: '600', color: '#1F2937' }}>
                  {platform.platform}
                </span>
              </div>
            </td>
            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>
              {platform.followers.toLocaleString()}
            </td>
            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>
              {platform.posts.toLocaleString()}
            </td>
            <td style={{ padding: '1rem', textAlign: 'right' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                background: `${platform.color}20`,
                color: platform.color,
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '0.9rem'
              }}>
                {platform.engagement}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Top Performing Content Component
function TopPerformingContent({ content }: { content: ContentItem[] }) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {content.map((item, index) => (
        <div key={item.id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem',
          background: index === 0 ? 'linear-gradient(135deg, #FFF9E6 0%, #FFF3CD 100%)' : '#f8fafc',
          borderRadius: '12px',
          border: index === 0 ? '2px solid #FFD700' : '1px solid #e5e7eb',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(4px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}>
          {/* Rank Badge */}
          <div style={{
            width: '36px',
            height: '36px',
            background: index === 0 ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' :
                       index === 1 ? 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)' :
                       index === 2 ? 'linear-gradient(135deg, #CD7F32 0%, #B87333 100%)' :
                       'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '700',
            fontSize: '0.9rem',
            flexShrink: 0
          }}>
            #{index + 1}
          </div>

          {/* Platform Icon */}
          <div style={{
            width: '40px',
            height: '40px',
            background: item.platformColor,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.2rem',
            flexShrink: 0
          }}>
            <i className={item.platform === 'YouTube' ? 'fab fa-youtube' : 'fab fa-facebook'}></i>
          </div>

          {/* Content Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: '600',
              color: '#1F2937',
              fontSize: '0.95rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: '0.25rem'
            }}>
              {item.title}
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: '#6B7280',
              display: 'flex',
              gap: '1rem'
            }}>
              <span><i className="fas fa-eye" style={{ marginRight: '0.25rem' }}></i>{formatNumber(item.views)}</span>
              <span><i className="fas fa-heart" style={{ marginRight: '0.25rem' }}></i>{formatNumber(item.likes)}</span>
              <span><i className="fas fa-comment" style={{ marginRight: '0.25rem' }}></i>{formatNumber(item.comments)}</span>
            </div>
          </div>

          {/* Engagement Rate */}
          <div style={{
            padding: '0.5rem 1rem',
            background: `${item.platformColor}15`,
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexShrink: 0
          }}>
            <i className="fas fa-chart-line" style={{ color: item.platformColor, fontSize: '0.8rem' }}></i>
            <span style={{ fontWeight: '700', color: item.platformColor, fontSize: '0.9rem' }}>
              {item.engagement.toFixed(1)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Platform Comparison Grid Component
function PlatformComparisonGrid({ platforms }: { platforms: PlatformSummary[] }) {
  const metrics = [
    { key: 'followers', label: 'Followers', icon: 'fas fa-users', format: (v: number) => v >= 1000 ? (v/1000).toFixed(1) + 'K' : v.toString() },
    { key: 'posts', label: 'Posts', icon: 'fas fa-file-alt', format: (v: number) => v.toString() },
    { key: 'engagement', label: 'Engagement', icon: 'fas fa-chart-line', format: (v: number) => v.toFixed(1) + '%' }
  ];

  // Find winner for each metric
  const getWinner = (key: string) => {
    let winner = platforms[0];
    platforms.forEach(p => {
      if ((p as any)[key] > (winner as any)[key]) {
        winner = p;
      }
    });
    return winner.platform;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
        <thead>
          <tr>
            <th style={{ 
              padding: '1rem', 
              textAlign: 'left', 
              background: '#f8fafc',
              borderRadius: '8px 0 0 0',
              color: '#6B7280',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Metric
            </th>
            {platforms.map((platform, idx) => (
              <th key={platform.platform} style={{ 
                padding: '1rem', 
                textAlign: 'center', 
                background: '#f8fafc',
                borderRadius: idx === platforms.length - 1 ? '0 8px 0 0' : '0',
                color: platform.color,
                fontWeight: '700'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    background: platform.color,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <i className={platform.icon}></i>
                  </div>
                  {platform.platform}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric, idx) => {
            const winner = getWinner(metric.key);
            return (
              <tr key={metric.key} style={{ borderBottom: idx < metrics.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <i className={metric.icon} style={{ color: '#F79B72', fontSize: '1rem' }}></i>
                    <span style={{ fontWeight: '600', color: '#374151' }}>{metric.label}</span>
                  </div>
                </td>
                {platforms.map((platform) => {
                  const value = (platform as any)[metric.key];
                  const isWinner = platform.platform === winner;
                  return (
                    <td key={platform.platform} style={{ 
                      padding: '1rem', 
                      textAlign: 'center',
                      background: isWinner ? `${platform.color}10` : 'transparent'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ 
                          fontWeight: isWinner ? '700' : '500', 
                          color: isWinner ? platform.color : '#374151',
                          fontSize: isWinner ? '1.1rem' : '1rem'
                        }}>
                          {metric.format(value)}
                        </span>
                        {isWinner && (
                          <i className="fas fa-crown" style={{ color: '#FFD700', fontSize: '0.8rem' }}></i>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Engagement Breakdown Chart Component
function EngagementBreakdownChart({ content }: { content: ContentItem[] }) {
  useEffect(() => {
    const ctx = document.getElementById('engagementBreakdownChart') as HTMLCanvasElement;
    if (!ctx) return;

    // @ts-ignore
    if (window.engagementBreakdownChartInstance) {
      // @ts-ignore
      window.engagementBreakdownChartInstance.destroy();
    }

    // Calculate total engagement metrics
    const totalLikes = content.reduce((sum, item) => sum + item.likes, 0);
    const totalComments = content.reduce((sum, item) => sum + item.comments, 0);
    const totalViews = content.reduce((sum, item) => sum + item.views, 0);

    import('chart.js/auto').then((ChartJS) => {
      // @ts-ignore
      window.engagementBreakdownChartInstance = new ChartJS.default(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Likes', 'Comments', 'Views'],
          datasets: [{
            data: [totalLikes, totalComments, Math.round(totalViews / 100)],
            backgroundColor: ['#EF4444', '#3B82F6', '#10B981'],
            borderColor: '#ffffff',
            borderWidth: 3,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '55%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 20,
                font: { size: 12, weight: 'bold' as const },
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: '#2A4759',
              padding: 12,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              callbacks: {
                label: (context: any) => {
                  const label = context.label || '';
                  let value = context.raw;
                  if (label === 'Views') value = value * 100;
                  if (value >= 1000000) return `${label}: ${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${label}: ${(value / 1000).toFixed(1)}K`;
                  return `${label}: ${value.toLocaleString()}`;
                }
              }
            }
          }
        }
      });
    });

    return () => {
      // @ts-ignore
      if (window.engagementBreakdownChartInstance) {
        // @ts-ignore
        window.engagementBreakdownChartInstance.destroy();
      }
    };
  }, [content]);

  return <canvas id="engagementBreakdownChart" style={{ maxHeight: '280px' }}></canvas>;
}

// Content Performance Timeline Chart Component
function ContentPerformanceTimeline({ content }: { content: ContentItem[] }) {
  useEffect(() => {
    const ctx = document.getElementById('contentPerformanceTimeline') as HTMLCanvasElement;
    if (!ctx) return;

    // @ts-ignore
    if (window.contentPerformanceTimelineInstance) {
      // @ts-ignore
      window.contentPerformanceTimelineInstance.destroy();
    }

    // Sort content by date and prepare data
    const sortedContent = [...content].sort((a, b) => 
      new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    ).slice(-10);

    const labels = sortedContent.map(item => {
      const date = new Date(item.publishedAt);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const viewsData = sortedContent.map(item => item.views);
    const engagementData = sortedContent.map(item => item.likes + item.comments);

    import('chart.js/auto').then((ChartJS) => {
      // @ts-ignore
      window.contentPerformanceTimelineInstance = new ChartJS.default(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Views',
              data: viewsData,
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: '#3B82F6',
              pointBorderColor: '#fff',
              pointBorderWidth: 2
            },
            {
              label: 'Engagement',
              data: engagementData,
              borderColor: '#F79B72',
              backgroundColor: 'rgba(247, 155, 114, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: '#F79B72',
              pointBorderColor: '#fff',
              pointBorderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 20,
                font: { size: 12, weight: 'bold' as const },
                usePointStyle: true
              }
            },
            tooltip: {
              backgroundColor: '#2A4759',
              padding: 12,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              callbacks: {
                label: (context: any) => {
                  const value = context.parsed.y;
                  if (value >= 1000000) return `${context.dataset.label}: ${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${context.dataset.label}: ${(value / 1000).toFixed(1)}K`;
                  return `${context.dataset.label}: ${value.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#f0f0f0'
              },
              ticks: {
                callback: (value: any) => {
                  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
                  return value;
                }
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    });

    return () => {
      // @ts-ignore
      if (window.contentPerformanceTimelineInstance) {
        // @ts-ignore
        window.contentPerformanceTimelineInstance.destroy();
      }
    };
  }, [content]);

  return <canvas id="contentPerformanceTimeline" style={{ maxHeight: '280px' }}></canvas>;
}

// Recent Activity Feed Component
function RecentActivityFeed({ content }: { content: ContentItem[] }) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {content.map((item, index) => (
        <div key={item.id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.25rem',
          background: index % 2 === 0 ? '#ffffff' : '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(4px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
          e.currentTarget.style.borderColor = item.platformColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = '#e5e7eb';
        }}>
          {/* Platform Icon */}
          <div style={{
            width: '48px',
            height: '48px',
            background: `linear-gradient(135deg, ${item.platformColor} 0%, ${item.platformColor}dd 100%)`,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.4rem',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${item.platformColor}40`
          }}>
            <i className={item.platform === 'YouTube' ? 'fab fa-youtube' : 'fab fa-facebook'}></i>
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: '600',
              color: '#1F2937',
              fontSize: '0.95rem',
              lineHeight: '1.4',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: '0.35rem'
            }}>
              {item.title}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              color: '#6B7280'
            }}>
              <span style={{
                background: `${item.platformColor}15`,
                color: item.platformColor,
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '0.7rem',
                textTransform: 'uppercase'
              }}>
                {item.platform}
              </span>
              <span style={{ color: '#d1d5db' }}>•</span>
              <span>{formatDate(item.publishedAt)}</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            flexShrink: 0
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '1rem', 
                fontWeight: '700', 
                color: '#1F2937',
                marginBottom: '0.15rem'
              }}>
                {formatNumber(item.views)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Views
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '1rem', 
                fontWeight: '700', 
                color: '#EF4444',
                marginBottom: '0.15rem'
              }}>
                {formatNumber(item.likes)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Likes
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '1rem', 
                fontWeight: '700', 
                color: '#3B82F6',
                marginBottom: '0.15rem'
              }}>
                {formatNumber(item.comments)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Comments
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
