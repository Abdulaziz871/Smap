'use client';

import { useState, useEffect } from 'react';

export default function AdminPanel() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState('users');
  const [stats, setStats] = useState({});

  const collections = [
    { value: 'users', label: 'Users' },
    { value: 'socialMediaTypes', label: 'Social Media Types' },
    { value: 'socialMediaAccounts', label: 'Social Media Accounts' },
    { value: 'followerAnalytics', label: 'Follower Analytics' },
    { value: 'engagementAnalytics', label: 'Engagement Analytics' },
    { value: 'postAnalytics', label: 'Post Analytics' }
  ];

  useEffect(() => {
    fetchData();
  }, [selectedCollection]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/view?collection=${selectedCollection}&limit=20`);
      const result = await response.json();
      
      if (response.ok) {
        setData(result.data);
        setStats({
          collection: result.collection,
          count: result.count,
          showing: result.data.length
        });
      } else {
        console.error('Error:', result.error);
      }
    } catch (error) {
      console.error('Network error:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/init-db', { method: 'POST' });
      const result = await response.json();
      
      if (response.ok) {
        alert('Database initialized successfully!');
        fetchData();
      } else {
        alert('Error initializing database: ' + result.error);
      }
    } catch (error) {
      alert('Network error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const renderValue = (value) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value.toString();
    return value;
  };

  return (
    <div style={{ padding: '2rem', background: '#EEEEEE', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: '#2A4759', marginBottom: '2rem', fontSize: '2.5rem', fontWeight: 'bold' }}>
          🔧 SMAP Admin Panel
        </h1>
        
        <div style={{ 
          background: 'white', 
          padding: '2rem', 
          borderRadius: '12px', 
          marginBottom: '2rem',
          boxShadow: '0 2px 10px rgba(42, 71, 89, 0.05)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <select 
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: '2px solid #DDDDDD',
                background: 'white',
                color: '#2A4759',
                fontSize: '1rem'
              }}
            >
              {collections.map(col => (
                <option key={col.value} value={col.value}>{col.label}</option>
              ))}
            </select>
            
            <button 
              onClick={fetchData}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#F79B72',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            
            <button 
              onClick={initializeDatabase}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#2A4759',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              Initialize DB
            </button>
          </div>
          
          {stats.collection && (
            <div style={{ 
              background: '#F79B72', 
              color: 'white', 
              padding: '1rem', 
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <strong>Collection:</strong> {stats.collection} | 
              <strong> Total:</strong> {stats.count} | 
              <strong> Showing:</strong> {stats.showing}
            </div>
          )}
        </div>

        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(42, 71, 89, 0.05)'
        }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#2A4759' }}>
              Loading data...
            </div>
          ) : data.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#2A4759' }}>
              No data found. Try initializing the database first.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2A4759', color: 'white' }}>
                    {data.length > 0 && Object.keys(data[0]).map(key => (
                      <th key={key} style={{ 
                        padding: '1rem', 
                        textAlign: 'left',
                        fontWeight: 'bold',
                        borderBottom: '2px solid #DDDDDD'
                      }}>
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index} style={{ 
                      background: index % 2 === 0 ? '#EEEEEE' : 'white',
                      borderBottom: '1px solid #DDDDDD'
                    }}>
                      {Object.values(item).map((value, i) => (
                        <td key={i} style={{ 
                          padding: '1rem', 
                          color: '#2A4759',
                          verticalAlign: 'top',
                          maxWidth: '200px',
                          wordBreak: 'break-word'
                        }}>
                          <pre style={{ 
                            margin: 0, 
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.9rem',
                            fontFamily: 'monospace'
                          }}>
                            {renderValue(value)}
                          </pre>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          background: 'white', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#2A4759', margin: 0 }}>
            <strong>Test Account:</strong> Email: test@smap.com | Password: password123
          </p>
        </div>
      </div>
    </div>
  );
}
