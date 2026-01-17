'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';

interface YouTubeData {
  channelId: string;
  channelTitle: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  thumbnails: any;
  lastSynced: string;
}

interface FacebookData {
  pageId: string;
  pageName: string;
  fanCount: number;
  talkingAboutCount: number;
  category: string;
}

interface SocialAccount {
  _id: string;
  username: string;
  SMType_ID: {
    _id: string;
    SMType_Description: string;
    iconUrl: string;
  };
  connected_at: string;
  last_sync_at: string;
}

export default function ConnectAccounts() {
  const [youtubeData, setYoutubeData] = useState<YouTubeData | null>(null);
  const [facebookData, setFacebookData] = useState<FacebookData | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get user ID from localStorage (you might want to get this from context/session)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('User from localStorage:', user); // Debug log
    
    if (user._id) {
      console.log('Setting userId:', user._id); // Debug log
      setUserId(user._id);
      fetchYouTubeData(user._id);
      fetchSocialAccounts(user._id);
    } else {
      console.log('No user ID found in localStorage'); // Debug log
      
      // For demo purposes, auto-set a test user ID if no user is logged in
      // Remove this in production
      const demoUserId = '687aa89d4170c1ec23421982'; // testuser ID
      setUserId(demoUserId);
      fetchYouTubeData(demoUserId); // Also fetch data for demo user
      fetchSocialAccounts(demoUserId);
      console.log('Auto-setting test user ID for demo'); // Debug log
    }

    // Check for URL parameters (success/error messages)
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success === 'youtube_connected') {
      setMessage('YouTube account connected successfully!');
      // Use the current userId state or the demo userId
      const currentUserId = user._id || userId || '687aa89d4170c1ec23421982';
      fetchYouTubeData(currentUserId);
    } else if (success === 'meta_connected') {
      setMessage('Meta account connected successfully!');
      // Use the current userId state or the demo userId
      const currentUserId = user._id || userId || '687aa89d4170c1ec23421982';
      fetchSocialAccounts(currentUserId);
    } else if (success === 'tiktok_connected') {
      setMessage('TikTok account connected successfully!');
      // Use the current userId state or the demo userId
      const currentUserId = user._id || userId || '687aa89d4170c1ec23421982';
      fetchSocialAccounts(currentUserId);
    } else if (error) {
      const errorMessages: { [key: string]: string } = {
        access_denied: 'Connection was cancelled.',
        invalid_request: 'Invalid request. Please try again.',
        processing_failed: 'Failed to process connection.',
        server_error: 'Server error. Please try again later.',
        token_expired: 'Authorization code expired. Please try connecting again.',
        user_not_found: 'User account not found. Please log in again.',
        invalid_state: 'Invalid connection state. Please try again.'
      };
      setMessage(errorMessages[error] || 'An error occurred.');
    }

    // Clear URL parameters after processing
    if (success || error) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Listen for Meta OAuth postMessage responses
    const handleMetaOAuthResponse = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      console.log('Received postMessage:', event.data); // Debug log
      
      if (event.data && typeof event.data === 'object') {
        if (event.data.success) {
          // Show detailed success message with account info
          let detailedMessage = event.data.message;
          if (event.data.accountDetails) {
            const details = event.data.accountDetails;
            if (event.data.platform === 'instagram') {
              detailedMessage += ` 📊 ${details.followers.toLocaleString()} followers, ${details.posts} posts`;
            } else if (event.data.platform === 'facebook') {
              detailedMessage += ` 📊 ${details.likes.toLocaleString()} likes`;
            }
          }
          setMessage(detailedMessage);
          console.log('✅ Account connected:', event.data.accountDetails);
          
          const currentUserId = user._id || userId || '687aa89d4170c1ec23421982';
          // Refresh both social accounts and YouTube data
          fetchSocialAccounts(currentUserId);
          fetchYouTubeData(currentUserId);
        } else if (event.data.error) {
          setMessage(`Connection failed: ${event.data.error}`);
        }
      }
    };

    window.addEventListener('message', handleMetaOAuthResponse);

    // Also check for URL-based success (for direct redirects)
    const checkForMetaSuccess = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const metaSuccess = urlParams.get('meta_success');
      if (metaSuccess) {
        setMessage(`${metaSuccess} account connected successfully!`);
        const currentUserId = user._id || userId || '687aa89d4170c1ec23421982';
        fetchSocialAccounts(currentUserId);
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    checkForMetaSuccess();

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('message', handleMetaOAuthResponse);
    };
  }, []);

  const fetchYouTubeData = async (uid: string) => {
    try {
      console.log('Fetching YouTube data for user:', uid); // Debug log
      const response = await fetch(`/api/youtube/sync?userId=${uid}`);
      const data = await response.json();
      console.log('YouTube sync response:', data); // Debug log
      
      if (data.isConnected) {
        console.log('Setting YouTube data:', data.youtubeData); // Debug log
        setYoutubeData(data.youtubeData);
      } else {
        console.log('YouTube not connected:', data.message); // Debug log
        setYoutubeData(null);
      }
    } catch (error) {
      console.error('Error fetching YouTube data:', error);
    }
  };

  const fetchFacebookData = async (uid: string) => {
    try {
      console.log('Fetching Facebook data for user:', uid);
      // Check if Facebook is connected via social accounts
      const account = socialAccounts.find(acc => 
        acc.SMType_ID.SMType_Description.toLowerCase() === 'facebook'
      );
      
      if (account) {
        // Fetch detailed Facebook page data from User model
        const response = await fetch(`/api/user/facebook?userId=${uid}`);
        if (response.ok) {
          const data = await response.json();
          if (data.facebookData) {
            setFacebookData(data.facebookData);
          }
        }
      } else {
        setFacebookData(null);
      }
    } catch (error) {
      console.error('Error fetching Facebook data:', error);
      setFacebookData(null);
    }
  };

  const fetchSocialAccounts = async (uid: string) => {
    try {
      console.log('Fetching social accounts for user:', uid);
      const response = await fetch(`/api/social-accounts?userId=${uid}`);
      const data = await response.json();
      console.log('Social accounts response:', data);
      
      if (response.ok && data.accounts) {
        setSocialAccounts(data.accounts);
        // Fetch Facebook data if Facebook is connected
        const fbAccount = data.accounts.find((acc: SocialAccount) => 
          acc.SMType_ID.SMType_Description.toLowerCase() === 'facebook'
        );
        if (fbAccount) {
          fetchFacebookData(uid);
        }
      } else {
        setSocialAccounts([]);
      }
    } catch (error) {
      console.error('Error fetching social accounts:', error);
      setSocialAccounts([]);
    }
  };

  const getAccountByPlatform = (platform: string) => {
    return socialAccounts.find(account => 
      account.SMType_ID.SMType_Description.toLowerCase() === platform.toLowerCase()
    );
  };

  const handleYouTubeConnect = async () => {
    console.log('YouTube connect clicked, userId:', userId); // Debug log
    
    if (!userId) {
      setMessage('Please log in to connect your YouTube account.');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching YouTube auth URL...'); // Debug log
      
      const response = await fetch(`/api/youtube/connect?userId=${userId}`);
      console.log('Response:', response.status, response.statusText); // Debug log
      
      const data = await response.json();
      console.log('Response data:', data); // Debug log
      
      if (data.authUrl) {
        console.log('Redirecting to:', data.authUrl); // Debug log
        // Redirect to YouTube OAuth
        window.location.href = data.authUrl;
      } else {
        setMessage('Failed to generate YouTube authorization URL.');
      }
    } catch (error) {
      console.error('Error connecting YouTube:', error);
      setMessage('Failed to connect YouTube account.');
    } finally {
      setLoading(false);
    }
  };

  const handleYouTubeDisconnect = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/youtube/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setYoutubeData(null);
        setMessage('YouTube account disconnected successfully.');
      } else {
        setMessage(data.error || 'Failed to disconnect YouTube account.');
      }
    } catch (error) {
      console.error('Error disconnecting YouTube:', error);
      setMessage('Failed to disconnect YouTube account.');
    } finally {
      setLoading(false);
    }
  };

  const handleYouTubeTestConnect = async () => {
    console.log('YouTube test connect clicked, userId:', userId); // Debug log
    
    if (!userId) {
      setMessage('Please log in to test YouTube connection.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/youtube/test-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setYoutubeData(data.youtubeData);
        setMessage('YouTube test connection successful! (Using mock data)');
      } else {
        setMessage(data.error || 'Failed to test connect YouTube account.');
      }
    } catch (error) {
      console.error('Error test connecting YouTube:', error);
      setMessage('Failed to test connect YouTube account.');
    } finally {
      setLoading(false);
    }
  };

  const handleMetaConnect = async (platform: 'instagram' | 'facebook') => {
    console.log(`${platform} connect clicked, userId:`, userId);
    
    if (!userId) {
      setMessage(`Please log in to connect your ${platform} account.`);
      return;
    }

    setConnectingPlatform(platform);
    try {
      console.log(`Fetching ${platform} auth URL...`);
      
      const response = await fetch(`/api/meta/connect?userId=${userId}&platform=${platform}`);
      console.log('Response:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        if (data.needsSetup) {
          setMessage(`${platform} connection setup required: ${data.message}`);
        } else {
          setMessage(data.error || `Failed to connect ${platform} account.`);
        }
        setConnectingPlatform(null);
        return;
      }
      
      if (data.authUrl) {
        console.log('Opening popup for:', data.authUrl);
        // Open Meta OAuth in a popup window
        const popup = window.open(
          data.authUrl,
          'metaAuth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );
        
        if (!popup) {
          setMessage('Popup blocked. Please allow popups for this site and try again.');
          setConnectingPlatform(null);
          return;
        }
        
        // Monitor popup closure
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            setConnectingPlatform(null);
          }
        }, 1000);
      } else if (data.demoMode) {
        setMessage(`Demo ${platform} connection created! Please complete Meta app setup for real connection.`);
        // Simulate connection by creating a demo account entry
        fetchSocialAccounts(userId);
        setConnectingPlatform(null);
      } else if (data.needsSetup) {
        setMessage(`${platform} connection setup required: ${data.message}`);
        setConnectingPlatform(null);
      } else {
        setMessage(`Failed to generate ${platform} authorization URL.`);
        setConnectingPlatform(null);
      }
    } catch (error) {
      console.error(`Error connecting ${platform}:`, error);
      setMessage(`Failed to connect ${platform} account.`);
      setConnectingPlatform(null);
    }
  };

  const handleTikTokConnect = async () => {
    if (!userId) {
      setMessage('Please log in to connect your TikTok account.');
      return;
    }

    setConnectingPlatform('tiktok');
    window.location.href = `/api/tiktok/connect?userId=${userId}`;
  };

  const handleTikTokDisconnect = async () => {
    if (!userId) return;

    setConnectingPlatform('tiktok');
    try {
      const response = await fetch('/api/tiktok/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('TikTok account disconnected successfully.');
        fetchSocialAccounts(userId);
      } else {
        setMessage(data.error || 'Failed to disconnect TikTok account.');
      }
    } catch (error) {
      console.error('Error disconnecting TikTok:', error);
      setMessage('Failed to disconnect TikTok account.');
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleMetaDisconnect = async (platform: 'instagram' | 'facebook') => {
    if (!userId) return;

    setConnectingPlatform(platform);
    try {
      const response = await fetch('/api/meta/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, platform }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Refresh social accounts to update the UI
        fetchSocialAccounts(userId);
        setMessage(`${platform} account disconnected successfully.`);
      } else {
        setMessage(data.error || `Failed to disconnect ${platform} account.`);
      }
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error);
      setMessage(`Failed to disconnect ${platform} account.`);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleQuickLogin = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpass123'
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setUserId(data.user._id);
        setMessage('Logged in successfully! You can now connect your accounts.');
        fetchYouTubeData(data.user._id);
        fetchSocialAccounts(data.user._id);
      } else {
        setMessage('Login failed: ' + data.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('Login error occurred.');
    }
  };

  const handleYouTubeSync = async () => {
    if (!userId) return;

    setLoading(true);
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
        setMessage('YouTube data synced successfully.');
      } else {
        setMessage(data.error || 'Failed to sync YouTube data.');
      }
    } catch (error) {
      console.error('Error syncing YouTube:', error);
      setMessage('Failed to sync YouTube data.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="dashboard-layout">
      <Sidebar activePage="connect" />

      {/* Main Content */}
      <main className="main-content" style={{background: '#F9FAFB'}}>
        {/* Page Header */}
        <div style={{
          background: 'linear-gradient(135deg, #2C3E50 0%, #34495E 100%)',
          padding: '3rem 2rem',
          borderRadius: '16px',
          marginBottom: '2rem',
          color: 'white',
          boxShadow: '0 10px 40px rgba(44,62,80,0.3)'
        }}>
          <div style={{maxWidth: '900px'}}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              margin: '0 0 1rem 0',
              letterSpacing: '-0.5px'
            }}>
              🔗 Connect Your Social Media
            </h1>
            <p style={{
              fontSize: '1.1rem',
              opacity: 0.95,
              margin: 0,
              lineHeight: '1.6'
            }}>
              Link your social media accounts to unlock powerful analytics and insights across all platforms.
            </p>
            <div style={{
              marginTop: '1.5rem',
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm0 18.182c-4.515 0-8.182-3.667-8.182-8.182S5.485 1.818 10 1.818s8.182 3.667 8.182 8.182-3.667 8.182-8.182 8.182z"/>
                  <path d="M13.636 6.364L8.636 11.364 6.364 9.091 5 10.455l3.636 3.636 6.364-6.364z"/>
                </svg>
                <span>Real-time Analytics</span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm0 18.182c-4.515 0-8.182-3.667-8.182-8.182S5.485 1.818 10 1.818s8.182 3.667 8.182 8.182-3.667 8.182-8.182 8.182z"/>
                  <path d="M13.636 6.364L8.636 11.364 6.364 9.091 5 10.455l3.636 3.636 6.364-6.364z"/>
                </svg>
                <span>Secure Connection</span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm0 18.182c-4.515 0-8.182-3.667-8.182-8.182S5.485 1.818 10 1.818s8.182 3.667 8.182 8.182-3.667 8.182-8.182 8.182z"/>
                  <path d="M13.636 6.364L8.636 11.364 6.364 9.091 5 10.455l3.636 3.636 6.364-6.364z"/>
                </svg>
                <span>Multi-Platform Support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            backgroundColor: message.includes('success') || message.includes('connected') ? '#d4edda' : '#f8d7da',
            color: message.includes('success') || message.includes('connected') ? '#155724' : '#721c24',
            border: `1px solid ${message.includes('success') || message.includes('connected') ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message}
            {message.includes('Please log in') && (
              <button 
                onClick={handleQuickLogin}
                style={{
                  marginLeft: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Quick Login
              </button>
            )}
            <button 
              onClick={() => setMessage('')} 
              style={{
                float: 'right',
                background: 'none',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: 'inherit'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Connected Accounts */}
        <div className="auth-form" style={{maxWidth: '100%', width: '100%'}}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem'
          }}>
            <h2 style={{color: '#2A4759', margin: 0, fontSize: '1.8rem'}}>Connected Accounts</h2>
            <div style={{color: '#6B7280', fontSize: '0.9rem'}}>
              {socialAccounts.length} {socialAccounts.length === 1 ? 'account' : 'accounts'} connected
            </div>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
          {/* YouTube */}
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '1.5rem', 
            background: 'white', 
            borderRadius: '12px', 
            marginBottom: '1rem',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <div style={{
                width: '50px', 
                height: '50px', 
                background: '#FF0000', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px rgba(255,0,0,0.3)'
              }}>
                <svg width="30" height="22" viewBox="0 0 30 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M29.41 3.44c-.35-1.3-1.37-2.32-2.67-2.67C24.38 0 15 0 15 0S5.62 0 3.26.77c-1.3.35-2.32 1.37-2.67 2.67C0 5.8 0 10.68 0 10.68s0 4.88.59 7.24c.35 1.3 1.37 2.32 2.67 2.67C5.62 21.36 15 21.36 15 21.36s9.38 0 11.74-.77c1.3-.35 2.32-1.37 2.67-2.67.59-2.36.59-7.24.59-7.24s0-4.88-.59-7.24zM12 15.18V6.18l7.85 4.5-7.85 4.5z" fill="white"/>
                </svg>
              </div>
              <div style={{flex: 1}}>
                <h4 style={{margin: 0, color: '#1F2937', fontSize: '1.1rem', fontWeight: '600'}}>YouTube</h4>
                {youtubeData ? (
                  <div>
                    <p style={{margin: '4px 0 0 0', color: '#6B7280', fontSize: '0.9rem'}}>
                      {youtubeData.channelTitle}
                    </p>
                    <p style={{margin: '2px 0 0 0', color: '#9CA3AF', fontSize: '0.8rem'}}>
                      📺 {youtubeData.subscriberCount?.toLocaleString()} subscribers • {youtubeData.videoCount} videos
                    </p>
                  </div>
                ) : (
                  <p style={{margin: '4px 0 0 0', color: '#9CA3AF', fontSize: '0.85rem'}}>Connect your YouTube channel</p>
                )}
              </div>
            </div>
            <div style={{display: 'flex', gap: '0.5rem'}}>
              {youtubeData ? (
                <>
                  <button 
                    onClick={handleYouTubeSync}
                    disabled={loading}
                    style={{
                      padding: '0.65rem 1.2rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                      color: 'white',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(6,182,212,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-1px)', e.currentTarget.style.boxShadow = '0 4px 8px rgba(6,182,212,0.4)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 2px 4px rgba(6,182,212,0.3)')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                    {loading ? 'Syncing...' : 'Sync'}
                  </button>
                  <button 
                    onClick={handleYouTubeDisconnect}
                    disabled={loading}
                    style={{
                      padding: '0.65rem 1.2rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderRadius: '8px',
                      background: 'white',
                      color: '#DC2626',
                      border: '2px solid #DC2626',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(220,38,38,0.2)'
                    }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#DC2626', e.currentTarget.style.color = 'white', e.currentTarget.style.transform = 'translateY(-1px)', e.currentTarget.style.boxShadow = '0 4px 8px rgba(220,38,38,0.3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'white', e.currentTarget.style.color = '#DC2626', e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 2px 4px rgba(220,38,38,0.2)')}
                  >
                    {loading ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </>
              ) : (
                <button 
                  className="btn-primary-auth" 
                  onClick={handleYouTubeConnect}
                  disabled={loading}
                  style={{
                    padding: '0.6rem 1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    borderRadius: '8px',
                    background: '#FF0000',
                    border: 'none'
                  }}
                >
                  {loading ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>

          {/* Facebook */}
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '1.5rem', 
            background: 'white', 
            borderRadius: '12px', 
            marginBottom: '1rem',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <div style={{
                width: '50px', 
                height: '50px', 
                background: '#1877F2', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px rgba(24,119,242,0.3)'
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="white"/>
                </svg>
              </div>
              <div style={{flex: 1}}>
                <h4 style={{margin: 0, color: '#1F2937', fontSize: '1.1rem', fontWeight: '600'}}>Facebook</h4>
                {getAccountByPlatform('facebook') ? (
                  <div>
                    <p style={{margin: '4px 0 0 0', color: '#6B7280', fontSize: '0.9rem'}}>
                      {getAccountByPlatform('facebook')?.username}
                    </p>
                    {facebookData && (
                      <p style={{margin: '2px 0 0 0', color: '#9CA3AF', fontSize: '0.8rem'}}>
                        👍 {facebookData.fanCount?.toLocaleString()} likes • {facebookData.category}
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{margin: '4px 0 0 0', color: '#9CA3AF', fontSize: '0.85rem'}}>Connect your Facebook Page</p>
                )}
              </div>
            </div>
            <div style={{display: 'flex', gap: '0.5rem'}}>
              {getAccountByPlatform('facebook') ? (
                <>
                  <button 
                    onClick={() => fetchFacebookData(userId!)}
                    disabled={connectingPlatform === 'facebook'}
                    style={{
                      padding: '0.65rem 1.2rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                      color: 'white',
                      border: 'none',
                      cursor: connectingPlatform === 'facebook' ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(6,182,212,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                    onMouseEnter={(e) => connectingPlatform !== 'facebook' && (e.currentTarget.style.transform = 'translateY(-1px)', e.currentTarget.style.boxShadow = '0 4px 8px rgba(6,182,212,0.4)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 2px 4px rgba(6,182,212,0.3)')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                    Sync
                  </button>
                  <button 
                    onClick={() => handleMetaDisconnect('facebook')}
                    disabled={connectingPlatform === 'facebook'}
                    style={{
                      padding: '0.65rem 1.2rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderRadius: '8px',
                      background: 'white',
                      color: '#DC2626',
                      border: '2px solid #DC2626',
                      cursor: connectingPlatform === 'facebook' ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(220,38,38,0.2)'
                    }}
                    onMouseEnter={(e) => connectingPlatform !== 'facebook' && (e.currentTarget.style.background = '#DC2626', e.currentTarget.style.color = 'white', e.currentTarget.style.transform = 'translateY(-1px)', e.currentTarget.style.boxShadow = '0 4px 8px rgba(220,38,38,0.3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'white', e.currentTarget.style.color = '#DC2626', e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 2px 4px rgba(220,38,38,0.2)')}
                  >
                    {connectingPlatform === 'facebook' ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </>
              ) : (
                <button 
                  className="btn-primary-auth"
                  onClick={() => handleMetaConnect('facebook')}
                  disabled={connectingPlatform === 'facebook'}
                  style={{
                    padding: '0.6rem 1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    borderRadius: '8px',
                    background: '#1877F2',
                    border: 'none'
                  }}
                >
                  {connectingPlatform === 'facebook' ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>

          {/* TikTok */}
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '1.5rem', 
            background: 'white', 
            borderRadius: '12px', 
            marginBottom: '1rem',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <div style={{
                width: '50px', 
                height: '50px', 
                background: '#000000', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
              }}>
                <svg width="24" height="24" viewBox="0 0 2859 3333" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2081 0c55 473 319 755 778 785v532c-266 26-499-61-770-225v1079c0 1374-1129 1860-1931 1212-782-634-346-2042 1004-1953v561c-87 14-180 36-265 65-254 86-398 247-358 531 77 544 1075 705 992-358V1h551z" fill="#EE1D52"/>
                  <path d="M2859 1449c-360-101-589-376-644-897L1564 552c0 1374-1129 1860-1931 1212-782-634-346-2042 1004-1953v561c-87 14-180 36-265 65-254 86-398 247-358 531 77 544 1075 705 992-358v-551l651 319c195 101 421 142 653 106l549-37z" fill="#69C9D0"/>
                </svg>
              </div>
              <div>
                <h4 style={{margin: 0, color: '#1F2937', fontSize: '1.1rem', fontWeight: '600'}}>TikTok</h4>
                {getAccountByPlatform('tiktok') ? (
                  <div>
                    <p style={{margin: '4px 0 0 0', color: '#6B7280', fontSize: '0.9rem'}}>
                      @{getAccountByPlatform('tiktok')?.username}
                    </p>
                    <p style={{margin: '2px 0 0 0', color: '#9CA3AF', fontSize: '0.8rem'}}>
                      Connected {new Date(getAccountByPlatform('tiktok')?.connected_at || '').toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p style={{margin: '4px 0 0 0', color: '#9CA3AF', fontSize: '0.85rem'}}>Connect your TikTok account</p>
                )}
              </div>
            </div>
            <div>
              {getAccountByPlatform('tiktok') ? (
                <button 
                  className="btn-secondary" 
                  onClick={handleTikTokDisconnect}
                  disabled={connectingPlatform === 'tiktok'}
                  style={{
                    padding: '0.6rem 1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    borderRadius: '8px',
                    background: '#EF4444',
                    border: 'none'
                  }}
                >
                  {connectingPlatform === 'tiktok' ? 'Disconnecting...' : 'Disconnect'}
                </button>
              ) : (
                <button 
                  className="btn-primary-auth" 
                  onClick={handleTikTokConnect}
                  disabled={connectingPlatform === 'tiktok'}
                  style={{
                    padding: '0.6rem 1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    borderRadius: '8px',
                    background: '#000000',
                    border: 'none'
                  }}
                >
                  {connectingPlatform === 'tiktok' ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>

          {/* Instagram - Under Maintenance */}
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '1.5rem', 
            background: 'white', 
            borderRadius: '12px', 
            marginBottom: '1rem',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            opacity: 0.6
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <div style={{
                width: '50px', 
                height: '50px', 
                background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px rgba(240,148,51,0.3)'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" fill="white"/>
                </svg>
              </div>
              <div>
                <h4 style={{margin: 0, color: '#1F2937', fontSize: '1.1rem', fontWeight: '600'}}>
                  Instagram
                  <span style={{
                    marginLeft: '0.5rem',
                    padding: '0.2rem 0.5rem',
                    background: '#FEF3C7',
                    color: '#92400E',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                    fontWeight: '600'
                  }}>UNDER MAINTENANCE</span>
                </h4>
                <p style={{margin: '4px 0 0 0', color: '#9CA3AF', fontSize: '0.85rem'}}>Temporarily unavailable</p>
              </div>
            </div>
            <button 
              className="btn-primary-auth" 
              disabled
              style={{
                padding: '0.6rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                borderRadius: '8px',
                background: '#9CA3AF',
                border: 'none',
                cursor: 'not-allowed'
              }}
            >
              Under Maintenance
            </button>
          </div>

          {/* Twitter/X */}
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '1.5rem', 
            background: 'white', 
            borderRadius: '12px', 
            marginBottom: '1rem',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            opacity: 0.6,
            gridColumn: '1 / -1'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <div style={{
                width: '50px', 
                height: '50px', 
                background: '#000000', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <div>
                <h4 style={{margin: 0, color: '#1F2937', fontSize: '1.1rem', fontWeight: '600'}}>
                  X (Twitter)
                  <span style={{
                    marginLeft: '0.5rem',
                    padding: '0.2rem 0.5rem',
                    background: '#FEF3C7',
                    color: '#92400E',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                    fontWeight: '600'
                  }}>COMING SOON</span>
                </h4>
                <p style={{margin: '4px 0 0 0', color: '#9CA3AF', fontSize: '0.85rem'}}>Connect your X (Twitter) account</p>
              </div>
            </div>
            <button 
              className="btn-primary-auth" 
              disabled
              style={{
                padding: '0.6rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                borderRadius: '8px',
                background: '#9CA3AF',
                border: 'none',
                cursor: 'not-allowed'
              }}
            >
              Coming Soon
            </button>
          </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="auth-form">
          <h3 style={{color: '#2A4759', marginBottom: '1.5rem'}}>How to Connect Your Accounts</h3>
          <div style={{color: '#2A4759', lineHeight: '1.6'}}>
            <ol style={{paddingLeft: '1.5rem'}}>
              <li style={{marginBottom: '0.5rem'}}>Click the "Connect" button next to the platform you want to add</li>
              <li style={{marginBottom: '0.5rem'}}>You'll be redirected to the platform's authorization page</li>
              <li style={{marginBottom: '0.5rem'}}>Sign in and grant SMAP permission to access your analytics data</li>
              <li style={{marginBottom: '0.5rem'}}>You'll be redirected back to SMAP with your account connected</li>
            </ol>
            <div style={{
              background: '#EEEEEE', 
              padding: '1rem', 
              borderRadius: '8px', 
              marginTop: '1.5rem',
              border: '2px solid #F79B72'
            }}>
              <strong style={{color: '#2A4759'}}>Note:</strong> SMAP only accesses your analytics data and never posts on your behalf. Your account credentials are securely encrypted and stored.
            </div>
          </div>
        </div>
      </main>

      {/* Chatbot */}
      <div className="chatbot-container">
        <button className="chatbot-toggle" onClick={() => {
          const window = document.querySelector('.chatbot-window') as HTMLElement;
          if (window) {
            window.style.display = window.style.display === 'none' ? 'block' : 'none';
          }
        }}>
          💬
        </button>
        <div className="chatbot-window">
          <div className="chatbot-header">
            SMAP Assistant
          </div>
          <div className="chatbot-body">
            <div style={{color: '#2A4759', marginBottom: '1rem'}}>
              Need help connecting your accounts? I'm here to guide you through the process!
            </div>
          </div>
          <div className="chatbot-input">
            <input type="text" placeholder="Ask about account connection..." />
          </div>
        </div>
      </div>
    </div>
  );
}
