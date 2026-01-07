'use client';

import { useState, useEffect } from 'react';

interface YouTubeData {
  channelId: string;
  channelTitle: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  thumbnails: any;
  lastSynced: string;
}

interface Video {
  videoId: string;
  title: string;
  description: string;
  thumbnails: any;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

interface YouTubeAnalyticsProps {
  userId: string;
}

export default function YouTubeAnalytics({ userId }: YouTubeAnalyticsProps) {
  const [youtubeData, setYoutubeData] = useState<YouTubeData | null>(null);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userId) {
      fetchYouTubeData();
    }
  }, [userId]);

  const fetchYouTubeData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/youtube/sync?userId=${userId}`);
      const data = await response.json();
      
      if (data.isConnected && data.youtubeData) {
        setYoutubeData(data.youtubeData);
      } else {
        setError('YouTube account not connected');
      }
    } catch (error) {
      console.error('Error fetching YouTube data:', error);
      setError('Failed to fetch YouTube data');
    } finally {
      setLoading(false);
    }
  };

  const syncYouTubeData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/youtube/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setYoutubeData(data.youtubeData);
        setRecentVideos(data.recentVideos || []);
      } else {
        setError(data.error || 'Failed to sync YouTube data');
      }
    } catch (error) {
      console.error('Error syncing YouTube data:', error);
      setError('Failed to sync YouTube data');
    } finally {
      setLoading(false);
    }
  };

  if (!youtubeData) {
    return (
      <div className="auth-form">
        <h3 style={{color: '#2A4759', marginBottom: '1.5rem'}}>YouTube Analytics</h3>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#2A4759',
          opacity: 0.7
        }}>
          {loading ? 'Loading...' : 'Connect your YouTube account to view analytics'}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{color: '#2A4759', margin: 0}}>YouTube Analytics</h3>
        <button 
          className="btn-primary-auth" 
          onClick={syncYouTubeData}
          disabled={loading}
          style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}
        >
          {loading ? 'Syncing...' : 'Sync Data'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          borderRadius: '8px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {/* Channel Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          padding: '1.5rem',
          background: '#EEEEEE',
          borderRadius: '8px',
          border: '2px solid #F79B72',
          textAlign: 'center'
        }}>
          <h4 style={{margin: 0, color: '#2A4759', fontSize: '2rem'}}>
            {youtubeData.subscriberCount?.toLocaleString()}
          </h4>
          <p style={{margin: 0, color: '#2A4759', opacity: 0.7}}>Subscribers</p>
        </div>

        <div style={{
          padding: '1.5rem',
          background: '#EEEEEE',
          borderRadius: '8px',
          border: '2px solid #F79B72',
          textAlign: 'center'
        }}>
          <h4 style={{margin: 0, color: '#2A4759', fontSize: '2rem'}}>
            {youtubeData.videoCount?.toLocaleString()}
          </h4>
          <p style={{margin: 0, color: '#2A4759', opacity: 0.7}}>Videos</p>
        </div>

        <div style={{
          padding: '1.5rem',
          background: '#EEEEEE',
          borderRadius: '8px',
          border: '2px solid #F79B72',
          textAlign: 'center'
        }}>
          <h4 style={{margin: 0, color: '#2A4759', fontSize: '2rem'}}>
            {youtubeData.viewCount?.toLocaleString()}
          </h4>
          <p style={{margin: 0, color: '#2A4759', opacity: 0.7}}>Total Views</p>
        </div>
      </div>

      {/* Channel Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1.5rem',
        background: '#EEEEEE',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        border: '2px solid #DDDDDD'
      }}>
        {youtubeData.thumbnails?.default && (
          <img 
            src={youtubeData.thumbnails.default.url} 
            alt="Channel Thumbnail"
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
        )}
        <div>
          <h4 style={{margin: 0, color: '#2A4759'}}>{youtubeData.channelTitle}</h4>
          <p style={{margin: 0, color: '#2A4759', opacity: 0.7, fontSize: '0.9rem'}}>
            Last synced: {youtubeData.lastSynced ? new Date(youtubeData.lastSynced).toLocaleString() : 'Never'}
          </p>
        </div>
      </div>

      {/* Recent Videos */}
      {recentVideos.length > 0 && (
        <div>
          <h4 style={{color: '#2A4759', marginBottom: '1rem'}}>Recent Videos</h4>
          <div style={{
            display: 'grid',
            gap: '1rem'
          }}>
            {recentVideos.slice(0, 5).map((video) => (
              <div key={video.videoId} style={{
                display: 'flex',
                gap: '1rem',
                padding: '1rem',
                background: '#EEEEEE',
                borderRadius: '8px',
                border: '2px solid #DDDDDD'
              }}>
                {video.thumbnails?.default && (
                  <img 
                    src={video.thumbnails.default.url} 
                    alt="Video Thumbnail"
                    style={{
                      width: '120px',
                      height: '90px',
                      borderRadius: '4px',
                      objectFit: 'cover'
                    }}
                  />
                )}
                <div style={{flex: 1}}>
                  <h5 style={{margin: 0, color: '#2A4759', marginBottom: '0.5rem'}}>
                    {video.title}
                  </h5>
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '0.9rem',
                    color: '#2A4759',
                    opacity: 0.7
                  }}>
                    <span>{video.viewCount?.toLocaleString()} views</span>
                    <span>{video.likeCount?.toLocaleString()} likes</span>
                    <span>{video.commentCount?.toLocaleString()} comments</span>
                  </div>
                  <p style={{
                    margin: 0,
                    marginTop: '0.5rem',
                    fontSize: '0.8rem',
                    color: '#2A4759',
                    opacity: 0.7
                  }}>
                    Published: {new Date(video.publishedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
