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

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [platformSummaries, setPlatformSummaries] = useState<PlatformSummary[]>([]);
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
      
      <main className="main-content" style={{background: '#F9FAFB'}}>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
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
                padding: '2rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: '2rem'
              }}>
                <h2 style={{margin: '0 0 1.5rem 0', color: '#2A4759', fontSize: '1.5rem'}}>
                  Platform Overview
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1.5rem'
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                {/* Followers Chart */}
                <div style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
