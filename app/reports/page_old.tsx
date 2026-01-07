'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Reports() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportType, setReportType] = useState('performance-overview');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube']);
  const [selectedMetrics, setSelectedMetrics] = useState([
    'Follower Growth',
    'Engagement Rate',
    'Reach & Impressions',
    'Top Posts'
  ]);
  const [exportFormat, setExportFormat] = useState('PDF');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          window.location.href = '/login';
          return;
        }

        const response = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          
          // Set default date range (last 30 days)
          const today = new Date();
          const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          setEndDate(today.toISOString().split('T')[0]);
          setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
        } else {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      
      const token = localStorage.getItem('token');
      const reportData = {
        reportType,
        platforms: selectedPlatforms,
        metrics: selectedMetrics,
        startDate,
        endDate,
        format: exportFormat
      };

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `SMAP_Report_${new Date().toISOString().split('T')[0]}.${exportFormat.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success message
        alert('Report generated successfully!');
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleMetricToggle = (metric: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  const downloadSampleReport = () => {
    // Create sample PDF content
    const sampleContent = `
SMAP Analytics Report - Sample
==============================

Date Range: ${startDate} to ${endDate}
Platforms: ${selectedPlatforms.join(', ')}
Generated: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY
This report provides insights into your social media performance
across selected platforms during the specified time period.

KEY METRICS
- Total Followers: 12,543
- Engagement Rate: 4.2%
- Total Reach: 89,432
- Total Impressions: 156,789

TOP PERFORMING CONTENT
1. "Behind the Scenes" Video - 2,345 likes
2. "Weekly Update" Post - 1,876 likes  
3. "Tutorial Series Pt. 1" - 1,654 likes

RECOMMENDATIONS
- Increase video content frequency
- Post during peak engagement hours (2-4 PM)
- Focus on behind-the-scenes content

This is a sample report. Connect your accounts to generate real data reports.
    `.trim();

    const blob = new Blob([sampleContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `SMAP_Sample_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #F79B72 0%, #2A4759 100%)',
        color: 'white',
        fontSize: '1.5rem'
      }}>
        <i className="fas fa-spinner fa-spin" style={{ marginRight: '1rem' }}></i>
        Loading...
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>SMAP</h2>
        </div>
        <nav>
          <ul className="sidebar-nav">
            <li><a href="/dashboard">📊 Dashboard</a></li>
            <li><a href="/analytics">📈 Analytics</a></li>
            <li><a href="/connect">🔗 Connect Accounts</a></li>
            <li><a href="/reports" className="active">📋 Reports</a></li>
            <li><a href="/settings">⚙️ Settings</a></li>
            <li><a href="/logout">🚪 Logout</a></li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Page Header */}
        <div className="page-header">
          <h1>Generate Reports</h1>
          <p>Create comprehensive reports for your social media performance across all platforms.</p>
        </div>

        {/* Report Generation Form */}
        <div className="auth-form">
          <h3 style={{color: '#2A4759', marginBottom: '1.5rem'}}>Custom Report Builder</h3>
          
          <div style={{display: 'grid', gap: '1.5rem'}}>
            {/* Report Type */}
            <div>
              <label style={{
                display: 'block',
                color: '#2A4759',
                fontWeight: 'bold',
                marginBottom: '0.5rem'
              }}>
                Report Type
              </label>
              <select style={{
                width: '100%',
                padding: '0.75rem',
                background: '#DDDDDD',
                border: '2px solid #DDDDDD',
                borderRadius: '4px',
                color: '#2A4759',
                fontWeight: 'bold'
              }}>
                <option>Performance Overview</option>
                <option>Engagement Analysis</option>
                <option>Follower Growth</option>
                <option>Content Performance</option>
                <option>Competitive Analysis</option>
                <option>Custom Report</option>
              </select>
            </div>

            {/* Platform Selection */}
            <div>
              <label style={{
                display: 'block',
                color: '#2A4759',
                fontWeight: 'bold',
                marginBottom: '0.5rem'
              }}>
                Platforms
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.5rem'
              }}>
                {['Instagram', 'Facebook', 'YouTube', 'X (Twitter)'].map((platform) => (
                  <label key={platform} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    background: '#DDDDDD',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: '2px solid #DDDDDD'
                  }}>
                    <input 
                      type="checkbox" 
                      defaultChecked={platform === 'Instagram'}
                      style={{accentColor: '#F79B72'}}
                    />
                    <span style={{color: '#2A4759', fontWeight: 'bold'}}>{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div>
                <label style={{
                  display: 'block',
                  color: '#2A4759',
                  fontWeight: 'bold',
                  marginBottom: '0.5rem'
                }}>
                  Start Date
                </label>
                <input 
                  type="date" 
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#DDDDDD',
                    border: '2px solid #DDDDDD',
                    borderRadius: '4px',
                    color: '#2A4759',
                    fontWeight: 'bold'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  color: '#2A4759',
                  fontWeight: 'bold',
                  marginBottom: '0.5rem'
                }}>
                  End Date
                </label>
                <input 
                  type="date" 
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#DDDDDD',
                    border: '2px solid #DDDDDD',
                    borderRadius: '4px',
                    color: '#2A4759',
                    fontWeight: 'bold'
                  }}
                />
              </div>
            </div>

            {/* Metrics Selection */}
            <div>
              <label style={{
                display: 'block',
                color: '#2A4759',
                fontWeight: 'bold',
                marginBottom: '0.5rem'
              }}>
                Include Metrics
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.5rem'
              }}>
                {[
                  'Follower Growth',
                  'Engagement Rate',
                  'Reach & Impressions',
                  'Top Posts',
                  'Audience Demographics',
                  'Posting Frequency'
                ].map((metric) => (
                  <label key={metric} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    background: '#DDDDDD',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: '2px solid #DDDDDD'
                  }}>
                    <input 
                      type="checkbox" 
                      defaultChecked={true}
                      style={{accentColor: '#F79B72'}}
                    />
                    <span style={{color: '#2A4759', fontWeight: 'bold', fontSize: '0.9rem'}}>{metric}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Report Format */}
            <div>
              <label style={{
                display: 'block',
                color: '#2A4759',
                fontWeight: 'bold',
                marginBottom: '0.5rem'
              }}>
                Export Format
              </label>
              <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                {['PDF', 'Excel', 'PowerPoint', 'CSV'].map((format) => (
                  <label key={format} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    background: '#DDDDDD',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: '2px solid #DDDDDD'
                  }}>
                    <input 
                      type="radio" 
                      name="format"
                      defaultChecked={format === 'PDF'}
                      style={{accentColor: '#F79B72'}}
                    />
                    <span style={{color: '#2A4759', fontWeight: 'bold'}}>{format}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button className="btn-primary-auth" style={{
              padding: '1rem 2rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              marginTop: '1rem'
            }}>
              📊 Generate Report
            </button>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="auth-form">
          <h3 style={{color: '#2A4759', marginBottom: '1.5rem'}}>Recent Reports</h3>
          
          <div style={{display: 'grid', gap: '1rem'}}>
            {/* Report 1 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              background: '#EEEEEE',
              borderRadius: '8px',
              border: '2px solid #DDDDDD'
            }}>
              <div>
                <h4 style={{margin: 0, color: '#2A4759'}}>Q4 2024 Performance Overview</h4>
                <p style={{margin: '0.25rem 0 0 0', color: '#2A4759', opacity: 0.7, fontSize: '0.9rem'}}>
                  Generated on Dec 15, 2024 • All Platforms • PDF
                </p>
              </div>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <button style={{
                  padding: '0.5rem 1rem',
                  background: '#2A4759',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  📥 Download
                </button>
                <button style={{
                  padding: '0.5rem 1rem',
                  background: '#F79B72',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  👁️ View
                </button>
              </div>
            </div>

            {/* Report 2 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              background: '#EEEEEE',
              borderRadius: '8px',
              border: '2px solid #DDDDDD'
            }}>
              <div>
                <h4 style={{margin: 0, color: '#2A4759'}}>Instagram Engagement Analysis</h4>
                <p style={{margin: '0.25rem 0 0 0', color: '#2A4759', opacity: 0.7, fontSize: '0.9rem'}}>
                  Generated on Dec 10, 2024 • Instagram Only • Excel
                </p>
              </div>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <button style={{
                  padding: '0.5rem 1rem',
                  background: '#2A4759',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  📥 Download
                </button>
                <button style={{
                  padding: '0.5rem 1rem',
                  background: '#F79B72',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  👁️ View
                </button>
              </div>
            </div>

            {/* Report 3 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              background: '#EEEEEE',
              borderRadius: '8px',
              border: '2px solid #DDDDDD'
            }}>
              <div>
                <h4 style={{margin: 0, color: '#2A4759'}}>Monthly Content Performance</h4>
                <p style={{margin: '0.25rem 0 0 0', color: '#2A4759', opacity: 0.7, fontSize: '0.9rem'}}>
                  Generated on Dec 1, 2024 • All Platforms • PowerPoint
                </p>
              </div>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <button style={{
                  padding: '0.5rem 1rem',
                  background: '#2A4759',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  📥 Download
                </button>
                <button style={{
                  padding: '0.5rem 1rem',
                  background: '#F79B72',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  👁️ View
                </button>
              </div>
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
              Need help generating the perfect report? I can suggest the best metrics and formats for your needs!
            </div>
          </div>
          <div className="chatbot-input">
            <input type="text" placeholder="Ask about report generation..." />
          </div>
        </div>
      </div>
    </div>
  );
}
