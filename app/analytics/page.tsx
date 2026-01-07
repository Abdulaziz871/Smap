'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout } from '../../utils/auth';
import Sidebar from '../../components/Sidebar';

interface YouTubeAnalytics {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  channelMetrics: {
    subscriberCount: number;
    totalVideoCount: number;
    totalViewCount: number;
    channelTitle: string;
    channelId: string;
  };
  recentVideos: Array<{
    videoId: string;
    title: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    publishedAt: string;
    thumbnails: any;
  }>;
  topVideos: Array<{
    videoId: string;
    title: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    publishedAt: string;
  }>;
  engagement: {
    averageViews: number;
    averageLikes: number;
    averageComments: number;
    engagementRate: string;
  };
}

export default function Analytics() {
  const [user, setUser] = useState<any>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'youtube' | 'facebook' | 'instagram' | 'tiktok'>('youtube');
  const [youtubeAnalytics, setYoutubeAnalytics] = useState<YouTubeAnalytics | null>(null);
  const [facebookAnalytics, setFacebookAnalytics] = useState<any>(null);
  const [instagramAnalytics, setInstagramAnalytics] = useState<any>(null);
  const [originalAnalytics, setOriginalAnalytics] = useState<YouTubeAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [filterType, setFilterType] = useState<'date' | 'video'>('date');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [isFiltered, setIsFiltered] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideoDetail, setSelectedVideoDetail] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getCurrentUser();
    console.log('🎯 Current user in analytics:', currentUser);
    if (!currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
      fetchYouTubeAnalytics(currentUser._id);
    }
  }, [router]);

  const fetchYouTubeAnalytics = async (userId: string, forceRefresh = false) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/analytics/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, forceRefresh }),
      });

      const data = await response.json();
      console.log('YouTube Analytics Response:', data);

      if (response.ok) {
        console.log('Analytics data structure:', data.analytics);
        setYoutubeAnalytics(data.analytics);
        setOriginalAnalytics(data.analytics);
        setLastUpdated(data.fromCache ? 'Cached data' : 'Just updated');
        setIsFiltered(false);
      } else {
        setError(data.error || 'Failed to fetch YouTube analytics');
      }
    } catch (err) {
      console.error('Error fetching YouTube analytics:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchFacebookAnalytics = async (userId: string, forceRefresh = false) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/analytics/facebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, forceRefresh }),
      });

      const data = await response.json();
      console.log('Facebook Analytics Response:', data);
      console.log('Facebook Analytics posts:', data.analytics?.posts);
      console.log('Facebook Analytics recentPosts:', data.analytics?.recentPosts);

      if (response.ok) {
        setFacebookAnalytics(data.analytics);
        setLastUpdated(data.fromCache ? 'Cached data' : 'Just updated');
      } else {
        setError(data.error || 'Failed to fetch Facebook analytics');
      }
    } catch (err) {
      console.error('Error fetching Facebook analytics:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstagramAnalytics = async (userId: string, forceRefresh = false) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/analytics/instagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, forceRefresh }),
      });

      const data = await response.json();
      console.log('Instagram Analytics Response:', data);

      if (response.ok) {
        setInstagramAnalytics(data.analytics);
        setLastUpdated(data.fromCache ? 'Cached data' : 'Just updated');
      } else {
        setError(data.error || 'Failed to fetch Instagram analytics');
      }
    } catch (err) {
      console.error('Error fetching Instagram analytics:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAnalytics = () => {
    if (user) {
      if (selectedPlatform === 'youtube') {
        fetchYouTubeAnalytics(user._id, true);
      } else if (selectedPlatform === 'facebook') {
        fetchFacebookAnalytics(user._id, true);
      } else if (selectedPlatform === 'instagram') {
        fetchInstagramAnalytics(user._id, true);
      }
    }
  };

  const handlePlatformChange = (platform: 'youtube' | 'facebook' | 'instagram' | 'tiktok') => {
    setSelectedPlatform(platform);
    if (user) {
      if (platform === 'youtube' && !youtubeAnalytics) {
        fetchYouTubeAnalytics(user._id);
      } else if (platform === 'facebook' && !facebookAnalytics) {
        fetchFacebookAnalytics(user._id);
      } else if (platform === 'instagram' && !instagramAnalytics) {
        fetchInstagramAnalytics(user._id);
      }
    }
  };

  const applyFilters = () => {
    if (!originalAnalytics) return;
    
    let filteredData = { ...originalAnalytics };
    
    if (filterType === 'date' && dateRange.startDate && dateRange.endDate) {
      // Filter analytics by date range
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      
      // Filter videos by publish date
      if (filteredData.recentVideos) {
        filteredData.recentVideos = filteredData.recentVideos.filter((video: any) => {
          const videoDate = new Date(video.publishedAt);
          return videoDate >= startDate && videoDate <= endDate;
        });
      }
      
      if (filteredData.topVideos) {
        filteredData.topVideos = filteredData.topVideos.filter((video: any) => {
          const videoDate = new Date(video.publishedAt);
          return videoDate >= startDate && videoDate <= endDate;
        });
      }
      
      // Recalculate engagement metrics based on filtered videos
      if (filteredData.topVideos && filteredData.topVideos.length > 0) {
        const totalViews = filteredData.topVideos.reduce((sum: number, video: any) => sum + (video.viewCount || 0), 0);
        const totalLikes = filteredData.topVideos.reduce((sum: number, video: any) => sum + (video.likeCount || 0), 0);
        const totalComments = filteredData.topVideos.reduce((sum: number, video: any) => sum + (video.commentCount || 0), 0);
        const videoCount = filteredData.topVideos.length;
        
        filteredData.engagement = {
          averageViews: Math.round(totalViews / videoCount),
          averageLikes: Math.round(totalLikes / videoCount),
          averageComments: Math.round(totalComments / videoCount),
          engagementRate: ((totalLikes + totalComments) / totalViews * 100).toFixed(2)
        };
        
        // Update channel metrics for filtered period
        filteredData.channelMetrics = {
          ...filteredData.channelMetrics,
          totalVideoCount: videoCount,
          totalViewCount: totalViews
        };
      } else {
        // No videos in date range
        filteredData.engagement = {
          averageViews: 0,
          averageLikes: 0,
          averageComments: 0,
          engagementRate: '0.00'
        };
        filteredData.channelMetrics = {
          ...filteredData.channelMetrics,
          totalVideoCount: 0,
          totalViewCount: 0
        };
      }
      
      filteredData.dateRange = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };
      
      setLastUpdated(`Filtered: ${dateRange.startDate} to ${dateRange.endDate}`);
      
    } else if (filterType === 'video' && selectedVideo) {
      // Filter analytics by specific video
      const selectedVideoData = originalAnalytics.topVideos?.find((video: any) => 
        video.title === selectedVideo
      );
      
      if (selectedVideoData) {
        // Create a properly typed video object for recentVideos
        const videoForRecent = {
          videoId: selectedVideoData.videoId,
          title: selectedVideoData.title,
          viewCount: selectedVideoData.viewCount,
          likeCount: selectedVideoData.likeCount,
          commentCount: selectedVideoData.commentCount,
          publishedAt: selectedVideoData.publishedAt,
          thumbnails: null // Add missing thumbnails property
        };
        
        // Show only the selected video
        filteredData.recentVideos = [videoForRecent];
        filteredData.topVideos = [selectedVideoData];
        
        // Set metrics based on single video
        filteredData.engagement = {
          averageViews: selectedVideoData.viewCount || 0,
          averageLikes: selectedVideoData.likeCount || 0,
          averageComments: selectedVideoData.commentCount || 0,
          engagementRate: (((selectedVideoData.likeCount || 0) + (selectedVideoData.commentCount || 0)) / (selectedVideoData.viewCount || 1) * 100).toFixed(2)
        };
        
        filteredData.channelMetrics = {
          ...filteredData.channelMetrics,
          totalVideoCount: 1,
          totalViewCount: selectedVideoData.viewCount || 0
        };
      }
      
      setLastUpdated(`Filtered: Video - ${selectedVideo}`);
    }
    
    setYoutubeAnalytics(filteredData);
    setIsFiltered(true);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilterType('date');
    setDateRange({ startDate: '', endDate: '' });
    setSelectedVideo('');
    setIsFiltered(false);
    if (originalAnalytics) {
      setYoutubeAnalytics(originalAnalytics);
      setLastUpdated('');
    }
  };

  const openVideoModal = () => {
    setShowVideoModal(true);
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideoDetail(null);
  };

  const selectVideoDetail = (video: any) => {
    setSelectedVideoDetail(video);
  };

  const calculateVideoEngagement = (video: any) => {
    const likes = video.likeCount || 0;
    const comments = video.commentCount || 0;
    const views = video.viewCount || 1;
    return ((likes + comments) / views * 100).toFixed(2);
  };

  const handleLogout = () => {
    logout();
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (!user) {
    return (
      <div className="center-container">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: '#2A4759'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: '0 8px 20px rgba(247, 155, 114, 0.3)'
          }}>
            <i className="fas fa-spinner fa-spin" style={{fontSize: '2rem', color: 'white'}}></i>
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '0.5rem'
          }}>Loading Analytics...</div>
          <div style={{
            fontSize: '1rem',
            opacity: 0.7,
            textAlign: 'center'
          }}>Preparing your social media insights</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar activePage="analytics" />

      {/* Main Content */}
      <main className="main-content">
        {/* Modern Professional Header */}
        <div style={{
          background: 'linear-gradient(135deg, #2A4759 0%, #1e3a4a 50%, #2A4759 100%)',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          marginBottom: '3rem',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 15px 35px rgba(42, 71, 89, 0.15)'
        }}>
          {/* Decorative Background Elements */}
          <div style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '200px',
            height: '200px',
            background: 'linear-gradient(135deg, rgba(247, 155, 114, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '-60px',
            left: '-60px',
            width: '120px',
            height: '120px',
            background: 'linear-gradient(135deg, rgba(247, 155, 114, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}></div>
          
          {/* Header Content */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '1.5rem',
                boxShadow: '0 8px 20px rgba(247, 155, 114, 0.3)'
              }}>
                <i className="fas fa-chart-line" style={{fontSize: '2rem', color: 'white'}}></i>
              </div>
              <div>
                <h1 style={{
                  margin: 0,
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>Analytics Overview</h1>
                <p style={{
                  margin: '0.5rem 0 0 0',
                  fontSize: '1.1rem',
                  opacity: 0.9,
                  fontWeight: '300'
                }}>Deep dive into your social media performance with interactive charts and insights.</p>
              </div>
            </div>
            
            {/* Platform Selector */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <button
                onClick={() => handlePlatformChange('youtube')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: selectedPlatform === 'youtube' ? 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)' : 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  border: selectedPlatform === 'youtube' ? 'none' : '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  boxShadow: selectedPlatform === 'youtube' ? '0 4px 12px rgba(255, 0, 0, 0.3)' : 'none'
                }}
                onMouseOver={(e) => {
                  if (selectedPlatform !== 'youtube') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedPlatform !== 'youtube') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }
                }}
              >
                <i className="fab fa-youtube"></i> YouTube
              </button>
              <button
                onClick={() => handlePlatformChange('facebook')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: selectedPlatform === 'facebook' ? 'linear-gradient(135deg, #1877F2 0%, #0C63D4 100%)' : 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  border: selectedPlatform === 'facebook' ? 'none' : '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  boxShadow: selectedPlatform === 'facebook' ? '0 4px 12px rgba(24, 119, 242, 0.3)' : 'none'
                }}
                onMouseOver={(e) => {
                  if (selectedPlatform !== 'facebook') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedPlatform !== 'facebook') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }
                }}
              >
                <i className="fab fa-facebook"></i> Facebook
              </button>
              <button
                onClick={() => handlePlatformChange('instagram')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: selectedPlatform === 'instagram' ? 'linear-gradient(135deg, #E4405F 0%, #C13584 50%, #833AB4 100%)' : 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  border: selectedPlatform === 'instagram' ? 'none' : '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  boxShadow: selectedPlatform === 'instagram' ? '0 4px 12px rgba(228, 64, 95, 0.3)' : 'none'
                }}
                onMouseOver={(e) => {
                  if (selectedPlatform !== 'instagram') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedPlatform !== 'instagram') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }
                }}
              >
                <i className="fab fa-instagram"></i> Instagram
              </button>
              <button
                onClick={() => handlePlatformChange('tiktok')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: selectedPlatform === 'tiktok' ? 'linear-gradient(135deg, #000000 0%, #EE1D52 100%)' : 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  border: selectedPlatform === 'tiktok' ? 'none' : '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  boxShadow: selectedPlatform === 'tiktok' ? '0 4px 12px rgba(0, 0, 0, 0.3)' : 'none'
                }}
                onMouseOver={(e) => {
                  if (selectedPlatform !== 'tiktok') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedPlatform !== 'tiktok') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 2859 3333" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2081 0c55 473 319 755 778 785v532c-266 26-499-61-770-225v1079c0 1374-1129 1860-1931 1212-782-634-346-2042 1004-1953v561c-87 14-180 36-265 65-254 86-398 247-358 531 77 544 1075 705 992-358V1h551z"/>
                </svg>
                TikTok
              </button>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <button 
                onClick={handleRefreshAnalytics}
                disabled={loading}
                style={{
                  padding: '0.875rem 2rem',
                  background: loading ? 'rgba(255, 255, 255, 0.2)' : 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  opacity: loading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.3s ease',
                  boxShadow: loading ? 'none' : '0 6px 15px rgba(247, 155, 114, 0.3)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(247, 155, 114, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 6px 15px rgba(247, 155, 114, 0.3)';
                  }
                }}
              >
                <i className={loading ? 'fas fa-spinner fa-spin' : 'fas fa-sync-alt'}></i>
                {loading ? 'Refreshing...' : 'Refresh Analytics'}
              </button>
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  padding: '0.875rem 2rem',
                  background: showFilters ? 'rgba(255, 255, 255, 0.25)' : (isFiltered ? 'rgba(247, 155, 114, 0.2)' : 'rgba(255, 255, 255, 0.15)'),
                  color: 'white',
                  border: showFilters || isFiltered ? '2px solid rgba(247, 155, 114, 0.5)' : '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = showFilters ? 'rgba(255, 255, 255, 0.25)' : (isFiltered ? 'rgba(247, 155, 114, 0.2)' : 'rgba(255, 255, 255, 0.15)');
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <i className="fas fa-filter"></i>
                {showFilters ? 'Hide Filters' : (isFiltered ? 'Filters Active' : 'Show Filters')}
                {isFiltered && !showFilters && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '20px',
                    height: '20px',
                    background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    color: 'white',
                    fontWeight: 'bold',
                    boxShadow: '0 3px 8px rgba(247, 155, 114, 0.4)'
                  }}>
                    1
                  </div>
                )}
              </button>
              
              {isFiltered && (
                <button 
                  onClick={resetFilters}
                  style={{
                    padding: '0.875rem 2rem',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <i className="fas fa-times"></i>
                  Clear Filters
                </button>
              )}
              
              {lastUpdated && (
                <div style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <i className="fas fa-clock" style={{color: '#F79B72'}}></i>
                  {lastUpdated}
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Enhanced Professional Filter Panel */}
          {showFilters && (
            <div style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              borderRadius: '20px',
              padding: '2.5rem',
              marginTop: '1.5rem',
              boxShadow: '0 12px 40px rgba(42, 71, 89, 0.15)',
              border: '1px solid rgba(247, 155, 114, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative background elements */}
              <div style={{
                position: 'absolute',
                top: '-60px',
                right: '-60px',
                width: '120px',
                height: '120px',
                background: 'linear-gradient(135deg, rgba(247, 155, 114, 0.12) 0%, rgba(42, 71, 89, 0.06) 100%)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '-40px',
                left: '-40px',
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, rgba(42, 71, 89, 0.12) 0%, rgba(247, 155, 114, 0.06) 100%)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }}></div>

              {/* Enhanced Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '2.5rem',
                paddingBottom: '1.5rem',
                borderBottom: '2px solid rgba(247, 155, 114, 0.15)'
              }}>
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <div style={{
                    width: '70px',
                    height: '70px',
                    background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1.5rem',
                    boxShadow: '0 6px 20px rgba(247, 155, 114, 0.35)',
                    position: 'relative'
                  }}>
                    <i className="fas fa-filter" style={{fontSize: '1.8rem', color: 'white'}}></i>
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '16px',
                      height: '16px',
                      background: isFiltered ? '#28a745' : '#ffc107',
                      borderRadius: '50%',
                      border: '2px solid white'
                    }}></div>
                  </div>
                  <div>
                    <h3 style={{color: '#2A4759', margin: 0, fontSize: '1.8rem', fontWeight: 'bold'}}>
                      Advanced Analytics Filter
                    </h3>
                    <p style={{color: '#6c757d', margin: '0.5rem 0 0 0', fontSize: '1.1rem'}}>
                      Customize your analytics view with precision filtering
                    </p>
                  </div>
                </div>
                <div style={{
                  background: isFiltered 
                    ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' 
                    : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '30px',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <i className={isFiltered ? 'fas fa-check-circle' : 'fas fa-clock'}></i>
                  {isFiltered ? 'Filters Active' : 'No Filters Applied'}
                </div>
              </div>

              {/* Enhanced Filter Type Selector */}
              <div style={{marginBottom: '2.5rem'}}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#2A4759',
                  fontWeight: 'bold',
                  marginBottom: '1.5rem',
                  fontSize: '1.3rem',
                  gap: '0.75rem'
                }}>
                  <i className="fas fa-layer-group" style={{color: '#F79B72'}}></i>
                  Filter Category:
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.5rem'
                }}>
                  <button
                    onClick={() => setFilterType('date')}
                    style={{
                      padding: '1.8rem',
                      background: filterType === 'date' 
                        ? 'linear-gradient(135deg, #2A4759 0%, #1e3a52 100%)' 
                        : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                      color: filterType === 'date' ? 'white' : '#2A4759',
                      border: filterType === 'date' ? 'none' : '2px solid #e9ecef',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: filterType === 'date' 
                        ? '0 8px 25px rgba(42, 71, 89, 0.35)' 
                        : '0 4px 15px rgba(0,0,0,0.1)',
                      transform: filterType === 'date' ? 'translateY(-4px) scale(1.02)' : 'none',
                      position: 'relative'
                    }}
                    onMouseOver={(e) => {
                      if (filterType !== 'date') {
                        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
                        e.currentTarget.style.borderColor = '#F79B72';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (filterType !== 'date') {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#e9ecef';
                      }
                    }}
                  >
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: filterType === 'date' 
                        ? 'rgba(255,255,255,0.2)' 
                        : 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className="fas fa-calendar-alt" style={{
                        fontSize: '1.8rem',
                        color: filterType === 'date' ? 'white' : 'white'
                      }}></i>
                    </div>
                    <div style={{textAlign: 'center'}}>
                      <div style={{fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem'}}>
                        Date Range Filter
                      </div>
                      <div style={{fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.4'}}>
                        Filter analytics by specific time periods and date ranges
                      </div>
                    </div>
                    {filterType === 'date' && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '24px',
                        height: '24px',
                        background: '#28a745',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-check" style={{fontSize: '0.8rem', color: 'white'}}></i>
                      </div>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setFilterType('video')}
                    style={{
                      padding: '1.8rem',
                      background: filterType === 'video' 
                        ? 'linear-gradient(135deg, #2A4759 0%, #1e3a52 100%)' 
                        : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                      color: filterType === 'video' ? 'white' : '#2A4759',
                      border: filterType === 'video' ? 'none' : '2px solid #e9ecef',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: filterType === 'video' 
                        ? '0 8px 25px rgba(42, 71, 89, 0.35)' 
                        : '0 4px 15px rgba(0,0,0,0.1)',
                      transform: filterType === 'video' ? 'translateY(-4px) scale(1.02)' : 'none',
                      position: 'relative'
                    }}
                    onMouseOver={(e) => {
                      if (filterType !== 'video') {
                        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
                        e.currentTarget.style.borderColor = '#F79B72';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (filterType !== 'video') {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#e9ecef';
                      }
                    }}
                  >
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: filterType === 'video' 
                        ? 'rgba(255,255,255,0.2)' 
                        : 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className="fas fa-video" style={{
                        fontSize: '1.8rem',
                        color: filterType === 'video' ? 'white' : 'white'
                      }}></i>
                    </div>
                    <div style={{textAlign: 'center'}}>
                      <div style={{fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem'}}>
                        Specific Video Analysis
                      </div>
                      <div style={{fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.4'}}>
                        Deep dive into individual video performance metrics
                      </div>
                    </div>
                    {filterType === 'video' && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '24px',
                        height: '24px',
                        background: '#28a745',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-check" style={{fontSize: '0.8rem', color: 'white'}}></i>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Enhanced Date Range Filter */}
              {filterType === 'date' && (
                <div style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderRadius: '16px',
                  padding: '2rem',
                  marginBottom: '2rem',
                  border: '1px solid rgba(247, 155, 114, 0.2)',
                  position: 'relative'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '1rem'
                    }}>
                      <i className="fas fa-calendar-check" style={{fontSize: '1.3rem', color: 'white'}}></i>
                    </div>
                    <h4 style={{color: '#2A4759', margin: 0, fontWeight: 'bold', fontSize: '1.4rem'}}>
                      Date Range Configuration
                    </h4>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '2rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#2A4759',
                        fontWeight: '600',
                        marginBottom: '0.75rem',
                        fontSize: '1.1rem',
                        gap: '0.5rem'
                      }}>
                        <i className="fas fa-play" style={{color: '#28a745'}}></i>
                        Start Date:
                      </label>
                      <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '1.2rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef',
                          fontSize: '1.1rem',
                          color: '#2A4759',
                          backgroundColor: 'white',
                          transition: 'all 0.3s ease',
                          fontWeight: '500'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#F79B72';
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(247, 155, 114, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e9ecef';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#2A4759',
                        fontWeight: '600',
                        marginBottom: '0.75rem',
                        fontSize: '1.1rem',
                        gap: '0.5rem'
                      }}>
                        <i className="fas fa-stop" style={{color: '#dc3545'}}></i>
                        End Date:
                      </label>
                      <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '1.2rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef',
                          fontSize: '1.1rem',
                          color: '#2A4759',
                          backgroundColor: 'white',
                          transition: 'all 0.3s ease',
                          fontWeight: '500'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#F79B72';
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(247, 155, 114, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e9ecef';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Quick Date Presets */}
                  <div style={{marginTop: '1.5rem'}}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: '#2A4759',
                      fontWeight: '600',
                      marginBottom: '1rem',
                      fontSize: '1rem',
                      gap: '0.5rem'
                    }}>
                      <i className="fas fa-bolt" style={{color: '#ffc107'}}></i>
                      Quick Date Presets:
                    </label>
                    <div style={{display: 'flex', gap: '0.75rem', flexWrap: 'wrap'}}>
                      {[
                        {label: 'Last 7 Days', days: 7, icon: 'fas fa-calendar-week'},
                        {label: 'Last 30 Days', days: 30, icon: 'fas fa-calendar-month'},
                        {label: 'Last 90 Days', days: 90, icon: 'fas fa-calendar-quarter'},
                        {label: 'This Year', days: Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)), icon: 'fas fa-calendar-year'}
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => {
                            const end = new Date();
                            const start = new Date();
                            start.setDate(end.getDate() - preset.days);
                            setDateRange({
                              startDate: start.toISOString().split('T')[0],
                              endDate: end.toISOString().split('T')[0]
                            });
                          }}
                          style={{
                            padding: '0.75rem 1.25rem',
                            background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '25px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(247, 155, 114, 0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <i className={preset.icon} style={{fontSize: '0.8rem'}}></i>
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Video Filter */}
              {filterType === 'video' && youtubeAnalytics?.topVideos && (
                <div style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderRadius: '16px',
                  padding: '2rem',
                  marginBottom: '2rem',
                  border: '1px solid rgba(247, 155, 114, 0.2)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '1rem'
                    }}>
                      <i className="fas fa-play-circle" style={{fontSize: '1.3rem', color: 'white'}}></i>
                    </div>
                    <h4 style={{color: '#2A4759', margin: 0, fontWeight: 'bold', fontSize: '1.4rem'}}>
                      Video Selection & Analysis
                    </h4>
                  </div>
                  
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: '#2A4759',
                    fontWeight: '600',
                    marginBottom: '1rem',
                    fontSize: '1.1rem',
                    gap: '0.5rem'
                  }}>
                    <i className="fas fa-search" style={{color: '#007bff'}}></i>
                    Choose a video to analyze in detail:
                  </label>
                  <select
                    value={selectedVideo}
                    onChange={(e) => setSelectedVideo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '1.2rem',
                      borderRadius: '12px',
                      border: '2px solid #e9ecef',
                      fontSize: '1.1rem',
                      color: '#2A4759',
                      backgroundColor: 'white',
                      transition: 'all 0.3s ease',
                      fontWeight: '500'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#F79B72';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(247, 155, 114, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e9ecef';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">🎬 Select a video to analyze...</option>
                    {youtubeAnalytics.topVideos.map((video: any, index: number) => (
                      <option key={video.videoId || index} value={video.title || `Video ${index + 1}`}>
                        📹 {video.title || `Video ${index + 1}`} ({video.viewCount || 0} views)
                      </option>
                    ))}
                  </select>
                  
                  {selectedVideo && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      background: 'rgba(40, 167, 69, 0.1)',
                      borderRadius: '10px',
                      border: '1px solid rgba(40, 167, 69, 0.2)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#28a745',
                        fontWeight: 'bold',
                        fontSize: '0.95rem'
                      }}>
                        <i className="fas fa-check-circle" style={{marginRight: '0.5rem'}}></i>
                        Selected: {selectedVideo}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Enhanced Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '1.5rem',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '2.5rem',
                paddingTop: '2rem',
                borderTop: '2px solid rgba(247, 155, 114, 0.15)'
              }}>
                <div style={{
                  fontSize: '1rem',
                  color: '#6c757d',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <i className="fas fa-info-circle" style={{color: '#17a2b8'}}></i>
                  Configure your filters and apply to customize the analytics view
                </div>
                <div style={{display: 'flex', gap: '1.5rem'}}>
                  <button
                    onClick={resetFilters}
                    style={{
                      padding: '1.2rem 2.5rem',
                      background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontSize: '1.1rem'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 53, 69, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <i className="fas fa-undo-alt"></i>
                    Reset All Filters
                  </button>
                  <button
                    onClick={applyFilters}
                    disabled={
                      (filterType === 'date' && (!dateRange.startDate || !dateRange.endDate)) ||
                      (filterType === 'video' && !selectedVideo)
                    }
                    style={{
                      padding: '1.2rem 2.5rem',
                      background: 
                        (filterType === 'date' && (!dateRange.startDate || !dateRange.endDate)) ||
                        (filterType === 'video' && !selectedVideo)
                          ? 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)'
                          : 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                      color: 
                        (filterType === 'date' && (!dateRange.startDate || !dateRange.endDate)) ||
                        (filterType === 'video' && !selectedVideo)
                          ? '#6c757d' : 'white',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 
                        (filterType === 'date' && (!dateRange.startDate || !dateRange.endDate)) ||
                        (filterType === 'video' && !selectedVideo)
                          ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontSize: '1.1rem',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseOver={(e) => {
                      if (!((filterType === 'date' && (!dateRange.startDate || !dateRange.endDate)) ||
                            (filterType === 'video' && !selectedVideo))) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #2A4759 0%, #1e3a52 100%)';
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(42, 71, 89, 0.4)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!((filterType === 'date' && (!dateRange.startDate || !dateRange.endDate)) ||
                            (filterType === 'video' && !selectedVideo))) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <i className="fas fa-rocket"></i>
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb'
          }}>
            <strong>
              {selectedPlatform === 'youtube' && 'YouTube'}
              {selectedPlatform === 'facebook' && 'Facebook'}
              {selectedPlatform === 'instagram' && 'Instagram'}
              {selectedPlatform === 'tiktok' && 'TikTok'}
              {' '}Connection Issue:
            </strong> {error}
            <div style={{marginTop: '0.5rem'}}>
              <a href="/connect" style={{color: '#007bff', textDecoration: 'underline'}}>
                → Go to Connect page to link your {
                  selectedPlatform === 'youtube' ? 'YouTube' :
                  selectedPlatform === 'facebook' ? 'Facebook' :
                  selectedPlatform === 'instagram' ? 'Instagram' :
                  selectedPlatform === 'tiktok' ? 'TikTok' : selectedPlatform
                } account
              </a>
            </div>
            <div style={{marginTop: '0.25rem', fontSize: '0.9rem', opacity: 0.8}}>
              Make sure you're connecting {
                selectedPlatform === 'youtube' ? 'YouTube' :
                selectedPlatform === 'facebook' ? 'Facebook' :
                selectedPlatform === 'instagram' ? 'Instagram' :
                selectedPlatform === 'tiktok' ? 'TikTok' : selectedPlatform
              } with the same account you're currently logged in with.
            </div>
          </div>
        )}

        {/* Analytics Content - Platform Specific */}
        {((selectedPlatform === 'youtube' && youtubeAnalytics) || (selectedPlatform === 'facebook' && facebookAnalytics)) ? (
          <div>
            {/* Channel Overview Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem',
              marginBottom: '3rem'
            }}>
              {/* First Card - Subscribers/Page Likes */}
              <div style={{
                background: 'linear-gradient(135deg, #2A4759 0%, #1e3a52 100%)',
                borderRadius: '20px',
                padding: '2rem',
                color: 'white',
                boxShadow: '0 15px 35px rgba(42, 71, 89, 0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }} onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 25px 50px rgba(42, 71, 89, 0.4)';
              }} onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(42, 71, 89, 0.3)';
              }}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <div>
                    <div style={{
                      fontSize: '3rem',
                      fontWeight: 'bold',
                      marginBottom: '0.5rem',
                      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      {selectedPlatform === 'youtube' 
                        ? formatNumber(youtubeAnalytics?.channelMetrics?.subscriberCount || 0)
                        : formatNumber(facebookAnalytics?.pageMetrics?.fanCount || 0)}
                    </div>
                    <div style={{
                      fontSize: '1.2rem',
                      opacity: 0.9,
                      fontWeight: '500'
                    }}>{selectedPlatform === 'youtube' ? 'Subscribers' : 'Page Likes'}</div>
                  </div>
                  <div style={{
                    fontSize: '4rem',
                    opacity: 0.3,
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}>
                    <i className="fas fa-users"></i>
                  </div>
                </div>
                <div style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(247, 155, 114, 0.2)',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(247, 155, 114, 0.3)'
                }}>
                  <i className="fas fa-trending-up" style={{marginRight: '0.5rem', color: '#F79B72'}}></i>
                  Growing audience
                </div>
              </div>

              {/* Videos Card */}
              <div style={{
                background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                borderRadius: '20px',
                padding: '2rem',
                color: 'white',
                boxShadow: '0 15px 35px rgba(247, 155, 114, 0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }} onClick={openVideoModal} onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 25px 50px rgba(247, 155, 114, 0.4)';
              }} onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(247, 155, 114, 0.3)';
              }}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <div>
                    <div style={{
                      fontSize: '3rem',
                      fontWeight: 'bold',
                      marginBottom: '0.5rem',
                      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      {selectedPlatform === 'youtube' 
                        ? formatNumber(youtubeAnalytics?.channelMetrics?.totalVideoCount || 0)
                        : formatNumber(facebookAnalytics?.posts?.length || 0)}
                    </div>
                    <div style={{
                      fontSize: '1.2rem',
                      opacity: 0.9,
                      fontWeight: '500'
                    }}>{selectedPlatform === 'youtube' ? 'Videos' : 'Posts'}</div>
                  </div>
                  <div style={{
                    fontSize: '4rem',
                    opacity: 0.3,
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}>
                    <i className="fas fa-video"></i>
                  </div>
                </div>
                <div style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(42, 71, 89, 0.2)',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(42, 71, 89, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <i className="fas fa-play-circle" style={{marginRight: '0.5rem', color: '#2A4759'}}></i>
                    Content library
                  </div>
                  <i className="fas fa-external-link-alt" style={{color: '#2A4759', fontSize: '0.8rem'}}></i>
                </div>
              </div>

              {/* Views Card */}
              <div style={{
                background: 'linear-gradient(135deg, #DDDDDD 0%, #c5c5c5 100%)',
                borderRadius: '20px',
                padding: '2rem',
                color: '#2A4759',
                boxShadow: '0 15px 35px rgba(221, 221, 221, 0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }} onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 25px 50px rgba(221, 221, 221, 0.4)';
              }} onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(221, 221, 221, 0.3)';
              }}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <div>
                    <div style={{
                      fontSize: '3rem',
                      fontWeight: 'bold',
                      marginBottom: '0.5rem',
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {selectedPlatform === 'youtube' 
                        ? formatNumber(youtubeAnalytics?.channelMetrics?.totalViewCount || 0)
                        : formatNumber(facebookAnalytics?.engagement?.totalEngagement || 0)}
                    </div>
                    <div style={{
                      fontSize: '1.2rem',
                      opacity: 0.8,
                      fontWeight: '500'
                    }}>{selectedPlatform === 'youtube' ? 'Total Views' : 'Total Engagement'}</div>
                  </div>
                  <div style={{
                    fontSize: '4rem',
                    opacity: 0.3,
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}>
                    <i className="fas fa-eye"></i>
                  </div>
                </div>
                <div style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(247, 155, 114, 0.2)',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(247, 155, 114, 0.3)'
                }}>
                  <i className="fas fa-chart-line" style={{marginRight: '0.5rem', color: '#F79B72'}}></i>
                  {selectedPlatform === 'youtube' ? 'Total reach' : 'Likes + Comments + Shares'}
                </div>
              </div>

              {/* Engagement Rate Card */}
              <div style={{
                background: 'linear-gradient(135deg, #EEEEEE 0%, #d9d9d9 100%)',
                borderRadius: '20px',
                padding: '2rem',
                color: '#2A4759',
                boxShadow: '0 15px 35px rgba(238, 238, 238, 0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }} onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 25px 50px rgba(238, 238, 238, 0.4)';
              }} onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(238, 238, 238, 0.3)';
              }}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <div>
                    <div style={{
                      fontSize: '3rem',
                      fontWeight: 'bold',
                      marginBottom: '0.5rem',
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {selectedPlatform === 'youtube' 
                        ? (youtubeAnalytics?.engagement?.engagementRate || '0')
                        : (facebookAnalytics?.engagement?.engagementRate || '0')}%
                    </div>
                    <div style={{
                      fontSize: '1.2rem',
                      opacity: 0.8,
                      fontWeight: '500'
                    }}>Engagement Rate</div>
                  </div>
                  <div style={{
                    fontSize: '4rem',
                    opacity: 0.3,
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}>
                    <i className="fas fa-heart"></i>
                  </div>
                </div>
                <div style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(247, 155, 114, 0.2)',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(247, 155, 114, 0.3)'
                }}>
                  <i className="fas fa-thumbs-up" style={{marginRight: '0.5rem', color: '#F79B72'}}></i>
                  Audience interaction
                </div>
              </div>
            </div>

            {/* Analytics Charts Section */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
              gap: '2rem',
              marginBottom: '3rem'
            }}>
              {/* Engagement Trend Chart */}
              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 10px 30px rgba(42, 71, 89, 0.1)',
                border: '1px solid rgba(221, 221, 221, 0.3)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <i className="fas fa-chart-line" style={{fontSize: '1.2rem', color: 'white'}}></i>
                  </div>
                  <h3 style={{color: '#2A4759', margin: 0, fontSize: '1.3rem', fontWeight: 'bold'}}>
                    Engagement Trend
                  </h3>
                </div>
                <AnalyticsEngagementChart 
                  platform={selectedPlatform}
                  youtubeData={youtubeAnalytics}
                  facebookData={facebookAnalytics}
                />
              </div>

              {/* Performance Metrics Chart */}
              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 10px 30px rgba(42, 71, 89, 0.1)',
                border: '1px solid rgba(221, 221, 221, 0.3)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(135deg, #2A4759 0%, #1e3a52 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <i className="fas fa-chart-bar" style={{fontSize: '1.2rem', color: 'white'}}></i>
                  </div>
                  <h3 style={{color: '#2A4759', margin: 0, fontSize: '1.3rem', fontWeight: 'bold'}}>
                    Performance Metrics
                  </h3>
                </div>
                <AnalyticsMetricsChart 
                  platform={selectedPlatform}
                  youtubeData={youtubeAnalytics}
                  facebookData={facebookAnalytics}
                />
              </div>
            </div>

            {/* Top Videos/Posts Section */}
            {((selectedPlatform === 'youtube' && youtubeAnalytics?.topVideos && youtubeAnalytics.topVideos.length > 0) ||
              (selectedPlatform === 'facebook' && facebookAnalytics?.posts && facebookAnalytics.posts.length > 0)) && (
              <div style={{
                background: 'linear-gradient(135deg, #EEEEEE 0%, #DDDDDD 100%)',
                borderRadius: '24px',
                padding: '2.5rem',
                marginBottom: '3rem',
                boxShadow: '0 10px 30px rgba(42, 71, 89, 0.1)',
                border: '1px solid rgba(221, 221, 221, 0.3)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '2rem'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <i className="fas fa-trophy" style={{fontSize: '1.5rem', color: 'white'}}></i>
                  </div>
                  <h3 style={{color: '#2A4759', margin: 0, fontSize: '1.5rem', fontWeight: 'bold'}}>
                    {selectedPlatform === 'youtube' ? 'Top Performing Videos' : 'Top Performing Posts'}
                  </h3>
                </div>
                <div style={{display: 'grid', gap: '1.5rem'}}>
                  {selectedPlatform === 'youtube' && youtubeAnalytics?.topVideos?.slice(0, 10).map((video: any, index: number) => (
                    <div key={video.videoId || index} style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      boxShadow: '0 4px 12px rgba(42, 71, 89, 0.1)',
                      border: '1px solid #DDDDDD',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }} onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(42, 71, 89, 0.15)';
                    }} onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(42, 71, 89, 0.1)';
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div style={{flex: 1, paddingRight: '1rem'}}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '0.75rem'
                          }}>
                            <div style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: index === 0 ? 'linear-gradient(135deg, #F79B72, #e8845c)' :
                                         index === 1 ? 'linear-gradient(135deg, #2A4759, #1e3a52)' :
                                         index === 2 ? 'linear-gradient(135deg, #DDDDDD, #c5c5c5)' :
                                         'linear-gradient(135deg, #EEEEEE, #d9d9d9)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: index < 2 ? 'white' : '#2A4759',
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                              marginRight: '1rem'
                            }}>
                              #{index + 1}
                            </div>
                            <div style={{
                              color: '#2A4759',
                              fontWeight: 'bold',
                              fontSize: '1.1rem',
                              lineHeight: '1.4'
                            }}>
                              {video.title || 'Untitled Video'}
                            </div>
                          </div>
                          <div style={{
                            color: '#2A4759',
                            opacity: 0.7,
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <i className="fas fa-calendar" style={{marginRight: '0.5rem'}}></i>
                            Published: {formatDate(video.publishedAt)}
                          </div>
                        </div>
                        <div style={{textAlign: 'right'}}>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}>
                            <div style={{
                              background: 'linear-gradient(135deg, #2A4759 0%, #1e3a52 100%)',
                              color: 'white',
                              padding: '0.5rem 1rem',
                              borderRadius: '12px',
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <i className="fas fa-eye" style={{marginRight: '0.5rem'}}></i>
                              {formatNumber(video.viewCount)} views
                            </div>
                            <div style={{
                              background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                              color: 'white',
                              padding: '0.5rem 1rem',
                              borderRadius: '12px',
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <i className="fas fa-thumbs-up" style={{marginRight: '0.5rem'}}></i>
                              {formatNumber(video.likeCount)} likes
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedPlatform === 'facebook' && facebookAnalytics?.topPosts?.slice(0, 10).map((post: any, index: number) => (
                    <div key={post.id || index} style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      boxShadow: '0 4px 12px rgba(42, 71, 89, 0.1)',
                      border: '1px solid #DDDDDD',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }} onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(42, 71, 89, 0.15)';
                    }} onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(42, 71, 89, 0.1)';
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div style={{flex: 1, paddingRight: '1rem'}}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '0.75rem'
                          }}>
                            <div style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: index === 0 ? 'linear-gradient(135deg, #F79B72, #e8845c)' :
                                         index === 1 ? 'linear-gradient(135deg, #2A4759, #1e3a52)' :
                                         index === 2 ? 'linear-gradient(135deg, #DDDDDD, #c5c5c5)' :
                                         'linear-gradient(135deg, #EEEEEE, #d9d9d9)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: index < 2 ? 'white' : '#2A4759',
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                              marginRight: '1rem'
                            }}>
                              #{index + 1}
                            </div>
                            <div style={{
                              color: '#2A4759',
                              fontWeight: 'bold',
                              fontSize: '1.1rem',
                              lineHeight: '1.4'
                            }}>
                              {post.message ? (post.message.length > 80 ? post.message.substring(0, 80) + '...' : post.message) : 'Post without message'}
                            </div>
                          </div>
                          <div style={{
                            color: '#2A4759',
                            opacity: 0.7,
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <i className="fas fa-calendar" style={{marginRight: '0.5rem'}}></i>
                            Posted: {formatDate(post.created_time)}
                          </div>
                        </div>
                        <div style={{textAlign: 'right'}}>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}>
                            <div style={{
                              background: 'linear-gradient(135deg, #2A4759 0%, #1e3a52 100%)',
                              color: 'white',
                              padding: '0.5rem 1rem',
                              borderRadius: '12px',
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <i className="fas fa-thumbs-up" style={{marginRight: '0.5rem'}}></i>
                              {formatNumber(post.likes?.summary?.total_count || 0)} likes
                            </div>
                            <div style={{
                              background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                              color: 'white',
                              padding: '0.5rem 1rem',
                              borderRadius: '12px',
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <i className="fas fa-comments" style={{marginRight: '0.5rem'}}></i>
                              {formatNumber(post.comments?.summary?.total_count || 0)} comments
                            </div>
                            <div style={{
                              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                              color: 'white',
                              padding: '0.5rem 1rem',
                              borderRadius: '12px',
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <i className="fas fa-share" style={{marginRight: '0.5rem'}}></i>
                              {formatNumber(post.shares?.count || 0)} shares
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Channel/Page Info Section */}
            <div style={{
              background: 'linear-gradient(135deg, #2A4759 0%, #1e3a52 100%)',
              borderRadius: '24px',
              padding: '2.5rem',
              marginBottom: '3rem',
              color: 'white',
              boxShadow: '0 20px 40px rgba(42, 71, 89, 0.3)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '70px',
                  height: '70px',
                  background: 'rgba(247, 155, 114, 0.2)',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '1.5rem',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(247, 155, 114, 0.3)'
                }}>
                  <i className={
                    selectedPlatform === 'youtube' ? 'fab fa-youtube' : 
                    selectedPlatform === 'facebook' ? 'fab fa-facebook' :
                    'fab fa-instagram'
                  } style={{fontSize: '2rem', color: '#F79B72'}}></i>
                </div>
                <div>
                  <h3 style={{margin: 0, fontSize: '1.8rem', fontWeight: 'bold'}}>
                    {selectedPlatform === 'youtube' 
                      ? (youtubeAnalytics?.channelMetrics?.channelTitle || 'Unknown Channel')
                      : selectedPlatform === 'facebook'
                      ? (facebookAnalytics?.pageMetrics?.name || 'Unknown Page')
                      : (instagramAnalytics?.accountMetrics?.username || 'Unknown Account')}
                  </h3>
                  <div style={{opacity: 0.8, marginTop: '0.5rem', fontSize: '1rem'}}>
                    {selectedPlatform === 'youtube' 
                      ? `Analytics data from ${formatDate(youtubeAnalytics?.dateRange?.startDate)} to ${formatDate(youtubeAnalytics?.dateRange?.endDate)}`
                      : selectedPlatform === 'facebook'
                      ? `Category: ${facebookAnalytics?.pageMetrics?.category || 'Unknown'}`
                      : `Followers: ${instagramAnalytics?.accountMetrics?.followersCount?.toLocaleString() || '0'}`}
                  </div>
                </div>
              </div>
              
              {/* Additional metrics if available */}
              {((selectedPlatform === 'youtube' && youtubeAnalytics?.engagement) || 
                (selectedPlatform === 'facebook' && facebookAnalytics?.posts)) && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '2rem'
                }}>
                  {selectedPlatform === 'youtube' ? (
                    <>
                      <div style={{
                        background: 'rgba(247, 155, 114, 0.1)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(247, 155, 114, 0.2)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '1rem'
                        }}>
                          <i className="fas fa-chart-bar" style={{
                            fontSize: '1.5rem',
                            marginRight: '0.75rem',
                            color: '#F79B72'
                          }}></i>
                          <div style={{fontWeight: '600', fontSize: '1.1rem'}}>
                            Average Views per Video
                          </div>
                        </div>
                        <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#F79B72'}}>
                          {formatNumber(youtubeAnalytics?.engagement?.averageViews)}
                        </div>
                      </div>
                      
                      <div style={{
                        background: 'rgba(221, 221, 221, 0.1)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(221, 221, 221, 0.2)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '1rem'
                        }}>
                          <i className="fas fa-thumbs-up" style={{
                            fontSize: '1.5rem',
                            marginRight: '0.75rem',
                            color: '#DDDDDD'
                          }}></i>
                          <div style={{fontWeight: '600', fontSize: '1.1rem'}}>
                            Average Likes per Video
                          </div>
                        </div>
                        <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#DDDDDD'}}>
                          {formatNumber(youtubeAnalytics?.engagement?.averageLikes)}
                        </div>
                      </div>
                      
                      <div style={{
                        background: 'rgba(238, 238, 238, 0.1)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(238, 238, 238, 0.2)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '1rem'
                        }}>
                          <i className="fas fa-comments" style={{
                            fontSize: '1.5rem',
                            marginRight: '0.75rem',
                            color: '#EEEEEE'
                          }}></i>
                          <div style={{fontWeight: '600', fontSize: '1.1rem'}}>
                            Average Comments per Video
                          </div>
                        </div>
                        <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#EEEEEE'}}>
                          {formatNumber(youtubeAnalytics?.engagement?.averageComments)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{
                        background: 'rgba(247, 155, 114, 0.1)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(247, 155, 114, 0.2)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '1rem'
                        }}>
                          <i className="fas fa-users" style={{
                            fontSize: '1.5rem',
                            marginRight: '0.75rem',
                            color: '#F79B72'
                          }}></i>
                          <div style={{fontWeight: '600', fontSize: '1.1rem'}}>
                            Total Posts
                          </div>
                        </div>
                        <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#F79B72'}}>
                          {formatNumber(facebookAnalytics?.posts?.length || 0)}
                        </div>
                      </div>
                      
                      <div style={{
                        background: 'rgba(221, 221, 221, 0.1)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(221, 221, 221, 0.2)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '1rem'
                        }}>
                          <i className="fas fa-heart" style={{
                            fontSize: '1.5rem',
                            marginRight: '0.75rem',
                            color: '#DDDDDD'
                          }}></i>
                          <div style={{fontWeight: '600', fontSize: '1.1rem'}}>
                            Page Likes
                          </div>
                        </div>
                        <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#DDDDDD'}}>
                          {formatNumber(facebookAnalytics?.pageMetrics?.fanCount || 0)}
                        </div>
                      </div>
                      
                      <div style={{
                        background: 'rgba(238, 238, 238, 0.1)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(238, 238, 238, 0.2)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '1rem'
                        }}>
                          <i className="fas fa-chart-line" style={{
                            fontSize: '1.5rem',
                            marginRight: '0.75rem',
                            color: '#EEEEEE'
                          }}></i>
                          <div style={{fontWeight: '600', fontSize: '1.1rem'}}>
                            Talking About This
                          </div>
                        </div>
                        <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#EEEEEE'}}>
                          {formatNumber(facebookAnalytics?.pageMetrics?.talkingAboutCount || 0)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          !loading && (
            <div style={{
              background: 'linear-gradient(135deg, #EEEEEE 0%, #DDDDDD 100%)',
              borderRadius: '24px',
              padding: '4rem 2rem',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(42, 71, 89, 0.1)',
              border: '1px solid rgba(221, 221, 221, 0.3)'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                background: selectedPlatform === 'youtube' ? 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)' :
                           selectedPlatform === 'facebook' ? 'linear-gradient(135deg, #1877F2 0%, #0C63D4 100%)' :
                           selectedPlatform === 'instagram' ? 'linear-gradient(135deg, #E4405F 0%, #C13584 50%, #833AB4 100%)' :
                           selectedPlatform === 'tiktok' ? 'linear-gradient(135deg, #000000 0%, #EE1D52 100%)' :
                           'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 2rem',
                boxShadow: selectedPlatform === 'youtube' ? '0 20px 40px rgba(247, 155, 114, 0.3)' :
                           selectedPlatform === 'facebook' ? '0 20px 40px rgba(24, 119, 242, 0.3)' :
                           selectedPlatform === 'instagram' ? '0 20px 40px rgba(228, 64, 95, 0.3)' :
                           selectedPlatform === 'tiktok' ? '0 20px 40px rgba(0, 0, 0, 0.3)' :
                           '0 20px 40px rgba(247, 155, 114, 0.3)'
              }}>
                <i className={
                  selectedPlatform === 'youtube' ? 'fab fa-youtube' :
                  selectedPlatform === 'facebook' ? 'fab fa-facebook' :
                  selectedPlatform === 'instagram' ? 'fab fa-instagram' :
                  selectedPlatform === 'tiktok' ? 'fab fa-tiktok' :
                  'fab fa-youtube'
                } style={{
                  fontSize: '3.5rem',
                  color: 'white'
                }}></i>
              </div>
              <h3 style={{
                color: '#2A4759',
                marginBottom: '1rem',
                fontSize: '2rem',
                fontWeight: 'bold'
              }}>
                No {
                  selectedPlatform === 'youtube' ? 'YouTube' :
                  selectedPlatform === 'facebook' ? 'Facebook' :
                  selectedPlatform === 'instagram' ? 'Instagram' :
                  selectedPlatform === 'tiktok' ? 'TikTok' :
                  'YouTube'
                } Analytics Available
              </h3>
              <p style={{
                color: '#2A4759',
                opacity: 0.7,
                marginBottom: '2.5rem',
                fontSize: '1.1rem',
                maxWidth: '500px',
                margin: '0 auto 2.5rem'
              }}>
                Connect your {
                  selectedPlatform === 'youtube' ? 'YouTube' :
                  selectedPlatform === 'facebook' ? 'Facebook' :
                  selectedPlatform === 'instagram' ? 'Instagram' :
                  selectedPlatform === 'tiktok' ? 'TikTok' :
                  'YouTube'
                } account to unlock detailed analytics, performance insights, and audience engagement data.
              </p>
              <a 
                href="/connect" 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1.25rem 2.5rem',
                  background: selectedPlatform === 'youtube' ? 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)' :
                             selectedPlatform === 'facebook' ? 'linear-gradient(135deg, #1877F2 0%, #0C63D4 100%)' :
                             selectedPlatform === 'instagram' ? 'linear-gradient(135deg, #E4405F 0%, #C13584 50%, #833AB4 100%)' :
                             selectedPlatform === 'tiktok' ? 'linear-gradient(135deg, #000000 0%, #EE1D52 100%)' :
                             'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '16px',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  transition: 'all 0.3s ease',
                  boxShadow: selectedPlatform === 'youtube' ? '0 8px 25px rgba(247, 155, 114, 0.3)' :
                             selectedPlatform === 'facebook' ? '0 8px 25px rgba(24, 119, 242, 0.3)' :
                             selectedPlatform === 'instagram' ? '0 8px 25px rgba(228, 64, 95, 0.3)' :
                             selectedPlatform === 'tiktok' ? '0 8px 25px rgba(0, 0, 0, 0.3)' :
                             '0 8px 25px rgba(247, 155, 114, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  const shadowColor = selectedPlatform === 'youtube' ? 'rgba(247, 155, 114, 0.4)' :
                                     selectedPlatform === 'facebook' ? 'rgba(24, 119, 242, 0.4)' :
                                     selectedPlatform === 'instagram' ? 'rgba(228, 64, 95, 0.4)' :
                                     selectedPlatform === 'tiktok' ? 'rgba(0, 0, 0, 0.4)' :
                                     'rgba(247, 155, 114, 0.4)';
                  e.currentTarget.style.boxShadow = `0 12px 35px ${shadowColor}`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  const shadowColor = selectedPlatform === 'youtube' ? 'rgba(247, 155, 114, 0.3)' :
                                     selectedPlatform === 'facebook' ? 'rgba(24, 119, 242, 0.3)' :
                                     selectedPlatform === 'instagram' ? 'rgba(228, 64, 95, 0.3)' :
                                     selectedPlatform === 'tiktok' ? 'rgba(0, 0, 0, 0.3)' :
                                     'rgba(247, 155, 114, 0.3)';
                  e.currentTarget.style.boxShadow = `0 8px 25px ${shadowColor}`;
                }}
              >
                <i className="fas fa-link"></i>
                Connect {
                  selectedPlatform === 'youtube' ? 'YouTube' :
                  selectedPlatform === 'facebook' ? 'Facebook' :
                  selectedPlatform === 'instagram' ? 'Instagram' :
                  selectedPlatform === 'tiktok' ? 'TikTok' :
                  'YouTube'
                } Account
              </a>
            </div>
          )
        )}

        {/* Video Details Modal */}
        {showVideoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }} onClick={closeVideoModal}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            width: '90%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #2A4759 0%, #1e3a52 100%)',
              padding: '2rem',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'rgba(247, 155, 114, 0.2)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '1.5rem',
                  border: '1px solid rgba(247, 155, 114, 0.3)'
                }}>
                  <i className="fas fa-video" style={{fontSize: '1.5rem', color: '#F79B72'}}></i>
                </div>
                <div>
                  <h2 style={{margin: 0, fontSize: '1.8rem', fontWeight: 'bold'}}>
                    {selectedPlatform === 'youtube' ? 'Video Analytics' : 'Post Analytics'}
                  </h2>
                  <p style={{margin: '0.5rem 0 0 0', opacity: 0.8}}>
                    {selectedPlatform === 'youtube' 
                      ? 'Detailed performance metrics for all videos' 
                      : 'Detailed performance metrics for all posts'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeVideoModal}
                style={{
                  background: 'rgba(247, 155, 114, 0.2)',
                  border: '1px solid rgba(247, 155, 114, 0.3)',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  color: '#F79B72',
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              display: 'flex',
              height: 'calc(90vh - 140px)'
            }}>
              
              {/* Video List */}
              <div style={{
                width: selectedVideoDetail ? '40%' : '100%',
                borderRight: selectedVideoDetail ? '1px solid #DDDDDD' : 'none',
                padding: '1.5rem',
                overflowY: 'auto',
                transition: 'all 0.3s ease'
              }}>
                <h3 style={{
                  color: '#2A4759',
                  marginBottom: '1.5rem',
                  fontSize: '1.3rem',
                  fontWeight: 'bold'
                }}>
                  {selectedPlatform === 'youtube' 
                    ? `All Videos (${youtubeAnalytics?.topVideos?.length || 0})`
                    : `All Posts (${facebookAnalytics?.posts?.length || 0})`}
                </h3>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  {selectedPlatform === 'youtube' && youtubeAnalytics?.topVideos?.map((video: any, index: number) => (
                    <div
                      key={video.videoId || index}
                      onClick={() => selectVideoDetail(video)}
                      style={{
                        background: selectedVideoDetail?.videoId === video.videoId 
                          ? 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)' 
                          : 'white',
                        color: selectedVideoDetail?.videoId === video.videoId ? 'white' : '#2A4759',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        border: selectedVideoDetail?.videoId === video.videoId 
                          ? 'none' 
                          : '2px solid #DDDDDD',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        if (selectedVideoDetail?.videoId !== video.videoId) {
                          e.currentTarget.style.borderColor = '#F79B72';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(42, 71, 89, 0.1)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (selectedVideoDetail?.videoId !== video.videoId) {
                          e.currentTarget.style.borderColor = '#DDDDDD';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <div style={{
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        marginBottom: '0.75rem',
                        lineHeight: '1.4'
                      }}>
                        {video.title || 'Untitled Video'}
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                        gap: '0.75rem',
                        fontSize: '0.9rem'
                      }}>
                        <div>
                          <div style={{opacity: 0.7, fontSize: '0.8rem'}}>Views</div>
                          <div style={{fontWeight: 'bold'}}>{formatNumber(video.viewCount)}</div>
                        </div>
                        <div>
                          <div style={{opacity: 0.7, fontSize: '0.8rem'}}>Likes</div>
                          <div style={{fontWeight: 'bold'}}>{formatNumber(video.likeCount)}</div>
                        </div>
                        <div>
                          <div style={{opacity: 0.7, fontSize: '0.8rem'}}>Engagement</div>
                          <div style={{fontWeight: 'bold'}}>{calculateVideoEngagement(video)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedPlatform === 'facebook' && facebookAnalytics?.posts?.map((post: any, index: number) => (
                    <div
                      key={post.id || index}
                      onClick={() => selectVideoDetail(post)}
                      style={{
                        background: selectedVideoDetail?.id === post.id 
                          ? 'linear-gradient(135deg, #1877F2 0%, #0C63D4 100%)' 
                          : 'white',
                        color: selectedVideoDetail?.id === post.id ? 'white' : '#2A4759',
                        borderRadius: '12px',
                        padding: '1rem',
                        cursor: 'pointer',
                        border: '1px solid #DDDDDD',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{
                        fontWeight: 'bold',
                        marginBottom: '0.75rem',
                        lineHeight: '1.4'
                      }}>
                        {post.message ? (post.message.length > 100 ? post.message.substring(0, 100) + '...' : post.message) : 'Post without message'}
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                        gap: '0.75rem',
                        fontSize: '0.9rem'
                      }}>
                        <div>
                          <div style={{opacity: 0.7, fontSize: '0.8rem'}}>Likes</div>
                          <div style={{fontWeight: 'bold'}}>{formatNumber(post.likes?.summary?.total_count || 0)}</div>
                        </div>
                        <div>
                          <div style={{opacity: 0.7, fontSize: '0.8rem'}}>Comments</div>
                          <div style={{fontWeight: 'bold'}}>{formatNumber(post.comments?.summary?.total_count || 0)}</div>
                        </div>
                        <div>
                          <div style={{opacity: 0.7, fontSize: '0.8rem'}}>Shares</div>
                          <div style={{fontWeight: 'bold'}}>{formatNumber(post.shares?.count || 0)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Video Detail Panel */}
              {selectedVideoDetail && (
                <div style={{
                  width: '60%',
                  padding: '1.5rem',
                  overflowY: 'auto',
                  backgroundColor: '#f8fafc'
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 4px 12px rgba(42, 71, 89, 0.1)'
                  }}>
                    <h3 style={{
                      color: '#2A4759',
                      marginBottom: '1rem',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      lineHeight: '1.4'
                    }}>
                      {selectedPlatform === 'youtube' 
                        ? selectedVideoDetail.title 
                        : (selectedVideoDetail.message?.substring(0, 150) || 'Post without message')}
                    </h3>
                    
                    <div style={{
                      color: '#2A4759',
                      opacity: 0.7,
                      marginBottom: '2rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <i className="fas fa-calendar" style={{marginRight: '0.5rem'}}></i>
                      Published: {formatDate(selectedPlatform === 'youtube' ? selectedVideoDetail.publishedAt : selectedVideoDetail.created_time)}
                    </div>

                    {/* Detailed Metrics */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: selectedPlatform === 'youtube' ? 'repeat(auto-fit, minmax(200px, 1fr))' : 'repeat(3, 1fr)',
                      gap: '1.5rem',
                      marginBottom: '2rem'
                    }}>
                      {/* Views (YouTube only) */}
                      {selectedPlatform === 'youtube' && (
                        <div style={{
                          background: 'linear-gradient(135deg, #2A4759 0%, #1e3a52 100%)',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          color: 'white',
                          textAlign: 'center'
                        }}>
                          <i className="fas fa-eye" style={{fontSize: '2rem', marginBottom: '0.5rem'}}></i>
                          <div style={{fontSize: '2rem', fontWeight: 'bold'}}>
                            {formatNumber(selectedVideoDetail.viewCount)}
                          </div>
                          <div style={{opacity: 0.8}}>Views</div>
                        </div>
                      )}

                      {/* Likes */}
                      <div style={{
                        background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        color: 'white',
                        textAlign: 'center'
                      }}>
                        <i className="fas fa-thumbs-up" style={{fontSize: '2rem', marginBottom: '0.5rem'}}></i>
                        <div style={{fontSize: '2rem', fontWeight: 'bold'}}>
                          {selectedPlatform === 'youtube' 
                            ? formatNumber(selectedVideoDetail.likeCount)
                            : formatNumber(selectedVideoDetail.likes?.summary?.total_count || 0)}
                        </div>
                        <div style={{opacity: 0.8}}>Likes</div>
                      </div>

                      {/* Comments */}
                      <div style={{
                        background: 'linear-gradient(135deg, #DDDDDD 0%, #c5c5c5 100%)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        color: '#2A4759',
                        textAlign: 'center'
                      }}>
                        <i className="fas fa-comments" style={{fontSize: '2rem', marginBottom: '0.5rem'}}></i>
                        <div style={{fontSize: '2rem', fontWeight: 'bold'}}>
                          {selectedPlatform === 'youtube' 
                            ? formatNumber(selectedVideoDetail.commentCount)
                            : formatNumber(selectedVideoDetail.comments?.summary?.total_count || 0)}
                        </div>
                        <div style={{opacity: 0.8}}>Comments</div>
                      </div>

                      {/* Shares (Facebook only) */}
                      {selectedPlatform === 'facebook' && (
                        <div style={{
                          background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          color: 'white',
                          textAlign: 'center'
                        }}>
                          <i className="fas fa-share" style={{fontSize: '2rem', marginBottom: '0.5rem'}}></i>
                          <div style={{fontSize: '2rem', fontWeight: 'bold'}}>
                            {formatNumber(selectedVideoDetail.shares?.count || 0)}
                          </div>
                          <div style={{opacity: 0.8}}>Shares</div>
                        </div>
                      )}

                      {/* Engagement Rate (YouTube only) */}
                      {selectedPlatform === 'youtube' && (
                        <div style={{
                          background: 'linear-gradient(135deg, #EEEEEE 0%, #d9d9d9 100%)',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          color: '#2A4759',
                          textAlign: 'center'
                        }}>
                          <i className="fas fa-chart-line" style={{fontSize: '2rem', marginBottom: '0.5rem'}}></i>
                          <div style={{fontSize: '2rem', fontWeight: 'bold'}}>
                            {calculateVideoEngagement(selectedVideoDetail)}%
                          </div>
                          <div style={{opacity: 0.8}}>Engagement Rate</div>
                        </div>
                      )}
                    </div>

                    {/* Performance Analysis */}
                    <div style={{
                      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      border: '1px solid #DDDDDD'
                    }}>
                      <h4 style={{
                        color: '#2A4759',
                        marginBottom: '1rem',
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }}>
                        Performance Insights
                      </h4>
                      <div style={{color: '#2A4759', lineHeight: '1.6'}}>
                        {selectedPlatform === 'youtube' ? (
                          <>
                            <p style={{marginBottom: '0.5rem'}}>
                              <strong>Engagement Score:</strong> {calculateVideoEngagement(selectedVideoDetail)}% 
                              {parseFloat(calculateVideoEngagement(selectedVideoDetail)) > 5 ? ' (Excellent)' : 
                               parseFloat(calculateVideoEngagement(selectedVideoDetail)) > 2 ? ' (Good)' : ' (Needs Improvement)'}
                            </p>
                            <p style={{marginBottom: '0.5rem'}}>
                              <strong>Like to View Ratio:</strong> {((selectedVideoDetail.likeCount / selectedVideoDetail.viewCount) * 100).toFixed(2)}%
                            </p>
                            <p style={{margin: 0}}>
                              <strong>Comment to View Ratio:</strong> {((selectedVideoDetail.commentCount / selectedVideoDetail.viewCount) * 100).toFixed(2)}%
                            </p>
                          </>
                        ) : (
                          <>
                            <p style={{marginBottom: '0.5rem'}}>
                              <strong>Total Engagement:</strong> {
                                (() => {
                                  const likes = selectedVideoDetail.likes?.summary?.total_count || 0;
                                  const comments = selectedVideoDetail.comments?.summary?.total_count || 0;
                                  const shares = selectedVideoDetail.shares?.count || 0;
                                  const total = likes + comments + shares;
                                  return formatNumber(total);
                                })()
                              } interactions
                              {(() => {
                                const likes = selectedVideoDetail.likes?.summary?.total_count || 0;
                                const comments = selectedVideoDetail.comments?.summary?.total_count || 0;
                                const shares = selectedVideoDetail.shares?.count || 0;
                                const total = likes + comments + shares;
                                return total > 200 ? ' (Excellent)' : total > 50 ? ' (Good)' : ' (Needs Improvement)';
                              })()}
                            </p>
 
                            <p style={{margin: 0}}>
                              <strong>Share Rate:</strong> {(() => {
                                const likes = selectedVideoDetail.likes?.summary?.total_count || 0;
                                const shares = selectedVideoDetail.shares?.count || 0;
                                const total = likes + shares;
                                return total > 0 ? ((shares / total) * 100).toFixed(2) : '0.00';
                              })()}% of total engagement
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

// Analytics Chart Components
function AnalyticsEngagementChart({ platform, youtubeData, facebookData }: { 
  platform: string, 
  youtubeData: any, 
  facebookData: any 
}) {
  useEffect(() => {
    const ctx = document.getElementById('analyticsEngagementChart') as HTMLCanvasElement;
    if (!ctx) return;

    // @ts-ignore
    if (window.analyticsEngagementChartInstance) {
      // @ts-ignore
      window.analyticsEngagementChartInstance.destroy();
    }

    const data = platform === 'youtube' ? youtubeData : facebookData;
    if (!data) return;

    // Prepare data based on platform
    let labels: string[] = [];
    let engagementData: number[] = [];
    let platformColor = platform === 'youtube' ? '#FF0000' : platform === 'facebook' ? '#1877F2' : '#E1306C';

    if (platform === 'youtube' && youtubeData?.topVideos) {
      labels = youtubeData.topVideos.slice(0, 7).map((v: any, i: number) => `Video ${i + 1}`);
      engagementData = youtubeData.topVideos.slice(0, 7).map((v: any) => {
        const views = v.viewCount || 0;
        const likes = v.likeCount || 0;
        const comments = v.commentCount || 0;
        return views > 0 ? ((likes + comments) / views * 100) : 0;
      });
    } else if (platform === 'facebook' && facebookData?.posts) {
      labels = facebookData.posts.slice(0, 7).map((p: any, i: number) => `Post ${i + 1}`);
      engagementData = facebookData.posts.slice(0, 7).map((p: any) => {
        const likes = p.likes?.summary?.total_count || 0;
        const comments = p.comments?.summary?.total_count || 0;
        const shares = p.shares?.count || 0;
        return likes + comments + shares;
      });
    }

    import('chart.js/auto').then((ChartJS) => {
      // @ts-ignore
      window.analyticsEngagementChartInstance = new ChartJS.default(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: platform === 'youtube' ? 'Engagement Rate (%)' : 'Total Interactions',
            data: engagementData,
            backgroundColor: `${platformColor}20`,
            borderColor: platformColor,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: platformColor,
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
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
                  const value = context.parsed.y.toFixed(2);
                  return platform === 'youtube' 
                    ? `Engagement: ${value}%`
                    : `Interactions: ${Math.round(context.parsed.y)}`;
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
                  if (platform === 'youtube') return value + '%';
                  if (value >= 1000) return (value / 1000) + 'K';
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
      if (window.analyticsEngagementChartInstance) {
        // @ts-ignore
        window.analyticsEngagementChartInstance.destroy();
      }
    };
  }, [platform, youtubeData, facebookData]);

  return <canvas id="analyticsEngagementChart" style={{ maxHeight: '300px' }}></canvas>;
}

function AnalyticsMetricsChart({ platform, youtubeData, facebookData }: { 
  platform: string, 
  youtubeData: any, 
  facebookData: any 
}) {
  useEffect(() => {
    const ctx = document.getElementById('analyticsMetricsChart') as HTMLCanvasElement;
    if (!ctx) return;

    // @ts-ignore
    if (window.analyticsMetricsChartInstance) {
      // @ts-ignore
      window.analyticsMetricsChartInstance.destroy();
    }

    const data = platform === 'youtube' ? youtubeData : facebookData;
    if (!data) return;

    let chartData: any = {};
    let platformColor = platform === 'youtube' ? '#FF0000' : platform === 'facebook' ? '#1877F2' : '#E1306C';

    if (platform === 'youtube' && youtubeData?.engagement) {
      chartData = {
        labels: ['Avg Views', 'Avg Likes', 'Avg Comments'],
        datasets: [{
          label: 'YouTube Metrics',
          data: [
            youtubeData.engagement.averageViews || 0,
            youtubeData.engagement.averageLikes || 0,
            youtubeData.engagement.averageComments || 0
          ],
          backgroundColor: ['#FF0000', '#F79B72', '#2A4759'],
          borderColor: ['#FF0000', '#F79B72', '#2A4759'],
          borderWidth: 2,
          borderRadius: 8
        }]
      };
    } else if (platform === 'facebook' && facebookData?.engagement) {
      chartData = {
        labels: ['Avg Likes', 'Avg Comments', 'Avg Shares'],
        datasets: [{
          label: 'Facebook Metrics',
          data: [
            facebookData.engagement.averageLikes || 0,
            facebookData.engagement.averageComments || 0,
            facebookData.engagement.averageShares || 0
          ],
          backgroundColor: ['#1877F2', '#F79B72', '#2A4759'],
          borderColor: ['#1877F2', '#F79B72', '#2A4759'],
          borderWidth: 2,
          borderRadius: 8
        }]
      };
    }

    import('chart.js/auto').then((ChartJS) => {
      // @ts-ignore
      window.analyticsMetricsChartInstance = new ChartJS.default(ctx, {
        type: 'bar',
        data: chartData,
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
                  const value = context.parsed.y;
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return value.toString();
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
                  if (value >= 1000000) return (value / 1000000) + 'M';
                  if (value >= 1000) return (value / 1000) + 'K';
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
      if (window.analyticsMetricsChartInstance) {
        // @ts-ignore
        window.analyticsMetricsChartInstance.destroy();
      }
    };
  }, [platform, youtubeData, facebookData]);

  return <canvas id="analyticsMetricsChart" style={{ maxHeight: '300px' }}></canvas>;
}
