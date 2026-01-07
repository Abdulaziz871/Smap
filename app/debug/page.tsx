'use client';

import { useState, useEffect } from 'react';

export default function DebugPage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [localStorageData, setLocalStorageData] = useState<string>('');

  useEffect(() => {
    // Check localStorage
    const userFromStorage = localStorage.getItem('user');
    setLocalStorageData(userFromStorage || 'No user data in localStorage');
    
    if (userFromStorage) {
      try {
        const parsedUser = JSON.parse(userFromStorage);
        setUserInfo(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const testYouTubeConnect = async () => {
    if (!userInfo?._id) {
      alert('No user ID found. Please log in first.');
      return;
    }

    try {
      const response = await fetch(`/api/youtube/connect?userId=${userInfo._id}`);
      const data = await response.json();
      
      console.log('YouTube connect response:', data);
      
      if (data.authUrl) {
        console.log('Auth URL:', data.authUrl);
        const openWindow = confirm('OAuth URL generated. Open in new window for testing?');
        if (openWindow) {
          window.open(data.authUrl, '_blank');
        }
      } else {
        alert('Failed to generate auth URL: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const loginAsTestUser = async () => {
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
        setUserInfo(data.user);
        alert('Logged in successfully!');
        window.location.reload();
      } else {
        alert('Login failed: ' + data.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>SMAP Debug Page</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h3>User Login Status</h3>
        <p><strong>localStorage data:</strong> {localStorageData}</p>
        <p><strong>Parsed user:</strong> {userInfo ? JSON.stringify(userInfo, null, 2) : 'None'}</p>
        <p><strong>User ID:</strong> {userInfo?._id || 'Not found'}</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Quick Actions</h3>
        <button 
          onClick={loginAsTestUser}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Login as Test User
        </button>
        
        <button 
          onClick={testYouTubeConnect}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test YouTube Connect
        </button>
      </div>

      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h3>Environment Check</h3>
        <p>Current URL: {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
        <p>Server should be running on port 3001</p>
      </div>

      <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3>Instructions</h3>
        <ol>
          <li>Click "Login as Test User" if you're not logged in</li>
          <li>Check that User ID appears above</li>
          <li>Click "Test YouTube Connect" to generate OAuth URL</li>
          <li>If OAuth URL appears, the API is working</li>
          <li>For full testing, you need real Google OAuth credentials</li>
        </ol>
      </div>
    </div>
  );
}
