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
      {/* Font Awesome CSS */}
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
      />

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2 style={{
            background: 'linear-gradient(135deg, #F79B72 0%, #2A4759 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <i className="fas fa-chart-line" style={{ marginRight: '0.5rem' }}></i>
            SMAP
          </h2>
        </div>
        <nav>
          <ul className="sidebar-nav">
            <li>
              <Link href="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
                <i className="fas fa-tachometer-alt" style={{ marginRight: '0.5rem' }}></i>
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/analytics" style={{ textDecoration: 'none', color: 'inherit' }}>
                <i className="fas fa-chart-bar" style={{ marginRight: '0.5rem' }}></i>
                Analytics
              </Link>
            </li>
            <li>
              <Link href="/connect" style={{ textDecoration: 'none', color: 'inherit' }}>
                <i className="fas fa-link" style={{ marginRight: '0.5rem' }}></i>
                Connect Accounts
              </Link>
            </li>
            <li>
              <Link href="/reports" className="active" style={{ textDecoration: 'none', color: 'inherit' }}>
                <i className="fas fa-file-alt" style={{ marginRight: '0.5rem' }}></i>
                Reports
              </Link>
            </li>
            <li>
              <Link href="/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
                <i className="fas fa-cog" style={{ marginRight: '0.5rem' }}></i>
                Settings
              </Link>
            </li>
            <li>
              <button 
                onClick={() => {
                  localStorage.removeItem('token');
                  window.location.href = '/login';
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: 'inherit',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem 1rem'
                }}
              >
                <i className="fas fa-sign-out-alt" style={{ marginRight: '0.5rem' }}></i>
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Page Header with Gradient */}
        <div style={{


          background: 'linear-gradient(135deg, rgb(42, 71, 89) 0%, rgb(30, 58, 74) 50%, rgb(42, 71, 89) 100%)',
          color: 'white',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(247, 155, 114, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <i className="fas fa-file-alt" style={{ fontSize: '2rem', marginRight: '1rem' }}></i>
            <div>
              <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>
                Generate Reports
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem', opacity: 0.9 }}>
                Create comprehensive analytics reports for your social media performance
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <i className="fas fa-chart-line" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></i>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>5</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Report Types</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <i className="fas fa-file-export" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></i>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>4</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Export Formats</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <i className="fas fa-download" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></i>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>12</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Generated Today</div>
            </div>
          </div>
        </div>

        {/* Report Builder Card */}
        <div style={{
          background: 'linear-gradient(135deg, #EEEEEE 0%, #DDDDDD 100%)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 16px rgba(42, 71, 89, 0.1)',
          border: '1px solid rgba(247, 155, 114, 0.2)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <i className="fas fa-magic" style={{
              fontSize: '1.5rem',
              color: '#F79B72',
              marginRight: '1rem'
            }}></i>
            <h2 style={{
              color: '#2A4759',
              margin: 0,
              fontSize: '1.8rem',
              fontWeight: 'bold'
            }}>
              Custom Report Builder
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {/* Report Configuration */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Report Type Selection */}
              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(42, 71, 89, 0.1)'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#2A4759',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                  fontSize: '1.1rem'
                }}>
                  <i className="fas fa-clipboard-list" style={{ marginRight: '0.5rem', color: '#F79B72' }}></i>
                  Report Type
                </label>
                <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #DDDDDD',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    color: '#2A4759',
                    fontWeight: 'bold',
                    background: '#F8F9FA',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#F79B72'}
                  onBlur={(e) => e.target.style.borderColor = '#DDDDDD'}
                >
                  <option value="performance-overview">📊 Performance Overview</option>
                  <option value="engagement-analysis">❤️ Engagement Analysis</option>
                  <option value="content-performance">🎯 Content Performance</option>
                  <option value="audience-insights">👥 Audience Insights</option>
                  <option value="competitive-analysis">🏆 Competitive Analysis</option>
                </select>
              </div>

              {/* Date Range */}
              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(42, 71, 89, 0.1)'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#2A4759',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                  fontSize: '1.1rem'
                }}>
                  <i className="fas fa-calendar-alt" style={{ marginRight: '0.5rem', color: '#F79B72' }}></i>
                  Date Range
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      padding: '0.75rem',
                      border: '2px solid #DDDDDD',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      color: '#2A4759',
                      fontWeight: 'bold',
                      background: '#F8F9FA'
                    }}
                  />
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      padding: '0.75rem',
                      border: '2px solid #DDDDDD',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      color: '#2A4759',
                      fontWeight: 'bold',
                      background: '#F8F9FA'
                    }}
                  />
                </div>
              </div>

              {/* Export Format */}
              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(42, 71, 89, 0.1)'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#2A4759',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                  fontSize: '1.1rem'
                }}>
                  <i className="fas fa-file-export" style={{ marginRight: '0.5rem', color: '#F79B72' }}></i>
                  Export Format
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { format: 'PDF', icon: 'fas fa-file-pdf', color: '#DC3545' },
                    { format: 'Excel', icon: 'fas fa-file-excel', color: '#198754' },
                    { format: 'PowerPoint', icon: 'fas fa-file-powerpoint', color: '#FD7E14' },
                    { format: 'CSV', icon: 'fas fa-file-csv', color: '#6F42C1' }
                  ].map(({ format, icon, color }) => (
                    <label key={format} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      background: exportFormat === format ? '#F79B72' : '#F8F9FA',
                      color: exportFormat === format ? 'white' : '#2A4759',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: `2px solid ${exportFormat === format ? '#F79B72' : '#DDDDDD'}`,
                      fontWeight: 'bold'
                    }}>
                      <input 
                        type="radio" 
                        name="format"
                        value={format}
                        checked={exportFormat === format}
                        onChange={(e) => setExportFormat(e.target.value)}
                        style={{ display: 'none' }}
                      />
                      <i className={icon} style={{ 
                        color: exportFormat === format ? 'white' : color,
                        fontSize: '1.1rem'
                      }}></i>
                      {format}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform & Metrics Selection */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Platform Selection */}
              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(42, 71, 89, 0.1)'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#2A4759',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                  fontSize: '1.1rem'
                }}>
                  <i className="fas fa-share-alt" style={{ marginRight: '0.5rem', color: '#F79B72' }}></i>
                  Platforms
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem'
                }}>
                  {[
                    { platform: 'youtube', icon: 'fab fa-youtube', color: '#FF0000', name: 'YouTube' },
                    { platform: 'instagram', icon: 'fab fa-instagram', color: '#E4405F', name: 'Instagram' },
                    { platform: 'facebook', icon: 'fab fa-facebook', color: '#1877F2', name: 'Facebook' },
                    { platform: 'twitter', icon: 'fab fa-twitter', color: '#1DA1F2', name: 'Twitter' }
                  ].map(({ platform, icon, color, name }) => (
                    <label key={platform} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      background: selectedPlatforms.includes(platform) ? color : '#F8F9FA',
                      color: selectedPlatforms.includes(platform) ? 'white' : '#2A4759',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: `2px solid ${selectedPlatforms.includes(platform) ? color : '#DDDDDD'}`,
                      fontWeight: 'bold'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={selectedPlatforms.includes(platform)}
                        onChange={() => handlePlatformToggle(platform)}
                        style={{ display: 'none' }}
                      />
                      <i className={icon} style={{ 
                        color: selectedPlatforms.includes(platform) ? 'white' : color,
                        fontSize: '1.1rem'
                      }}></i>
                      {name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Metrics Selection */}
              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(42, 71, 89, 0.1)'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#2A4759',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                  fontSize: '1.1rem'
                }}>
                  <i className="fas fa-chart-bar" style={{ marginRight: '0.5rem', color: '#F79B72' }}></i>
                  Include Metrics
                </label>
                <div style={{
                  display: 'grid',
                  gap: '0.5rem'
                }}>
                  {[
                    { metric: 'Follower Growth', icon: 'fas fa-user-plus' },
                    { metric: 'Engagement Rate', icon: 'fas fa-heart' },
                    { metric: 'Reach & Impressions', icon: 'fas fa-eye' },
                    { metric: 'Top Posts', icon: 'fas fa-star' },
                    { metric: 'Audience Demographics', icon: 'fas fa-users' },
                    { metric: 'Posting Frequency', icon: 'fas fa-clock' }
                  ].map(({ metric, icon }) => (
                    <label key={metric} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: selectedMetrics.includes(metric) ? '#F79B72' : '#F8F9FA',
                      color: selectedMetrics.includes(metric) ? 'white' : '#2A4759',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: `2px solid ${selectedMetrics.includes(metric) ? '#F79B72' : '#DDDDDD'}`,
                      fontWeight: 'bold'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={selectedMetrics.includes(metric)}
                        onChange={() => handleMetricToggle(metric)}
                        style={{ display: 'none' }}
                      />
                      <i className={icon} style={{ 
                        color: selectedMetrics.includes(metric) ? 'white' : '#F79B72',
                        fontSize: '1rem'
                      }}></i>
                      {metric}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Generate Report Button */}
          <div style={{
            marginTop: '2rem',
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center'
          }}>
            <button 
              onClick={handleGenerateReport}
              disabled={generatingReport || selectedPlatforms.length === 0}
              style={{
                padding: '1rem 2rem',
                background: generatingReport ? '#DDDDDD' : 'linear-gradient(135deg, #F79B72 0%, #2A4759 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: generatingReport ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(247, 155, 114, 0.3)',
                transition: 'all 0.3s ease',
                minWidth: '200px'
              }}
              onMouseOver={(e) => {
                if (!generatingReport && selectedPlatforms.length > 0) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(247, 155, 114, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(247, 155, 114, 0.3)';
              }}
            >
              {generatingReport ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-file-download" style={{ marginRight: '0.5rem' }}></i>
                  Generate Report
                </>
              )}
            </button>
            
            <button 
              onClick={downloadSampleReport}
              style={{
                padding: '1rem 2rem',
                background: 'white',
                color: '#2A4759',
                border: '2px solid #F79B72',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minWidth: '200px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#F79B72';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#2A4759';
              }}
            >
              <i className="fas fa-download" style={{ marginRight: '0.5rem' }}></i>
              Download Sample
            </button>
          </div>
        </div>

        {/* Recent Reports Section */}
        <div style={{
          background: 'linear-gradient(135deg, #EEEEEE 0%, #DDDDDD 100%)',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 16px rgba(42, 71, 89, 0.1)',
          border: '1px solid rgba(247, 155, 114, 0.2)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <i className="fas fa-history" style={{
              fontSize: '1.5rem',
              color: '#F79B72',
              marginRight: '1rem'
            }}></i>
            <h2 style={{
              color: '#2A4759',
              margin: 0,
              fontSize: '1.8rem',
              fontWeight: 'bold'
            }}>
              Recent Reports
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gap: '1rem'
          }}>
            {/* Sample Report Cards */}
            {[
              {
                title: 'Q4 2024 Performance Overview',
                date: 'Dec 15, 2024',
                platforms: 'All Platforms',
                format: 'PDF',
                icon: 'fas fa-chart-line',
                color: '#F79B72'
              },
              {
                title: 'YouTube Content Analysis',
                date: 'Dec 12, 2024',
                platforms: 'YouTube Only',
                format: 'Excel',
                icon: 'fab fa-youtube',
                color: '#FF0000'
              },
              {
                title: 'Monthly Engagement Report',
                date: 'Dec 1, 2024',
                platforms: 'Instagram, Facebook',
                format: 'PowerPoint',
                icon: 'fas fa-heart',
                color: '#E4405F'
              }
            ].map((report, index) => (
              <div key={index} style={{
                background: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(42, 71, 89, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(42, 71, 89, 0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(42, 71, 89, 0.1)';
              }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${report.color} 0%, #2A4759 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <i className={report.icon}></i>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#2A4759', fontSize: '1.1rem', fontWeight: 'bold' }}>
                      {report.title}
                    </h4>
                    <p style={{ 
                      margin: '0.25rem 0 0 0', 
                      color: '#2A4759', 
                      opacity: 0.7, 
                      fontSize: '0.9rem' 
                    }}>
                      Generated on {report.date} • {report.platforms} • {report.format}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={downloadSampleReport}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#2A4759',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#1a2f3d'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#2A4759'}
                  >
                    <i className="fas fa-download" style={{ marginRight: '0.5rem' }}></i>
                    Download
                  </button>
                  <button style={{
                    padding: '0.5rem 1rem',
                    background: '#F79B72',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#e8855e'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#F79B72'}
                  >
                    <i className="fas fa-eye" style={{ marginRight: '0.5rem' }}></i>
                    Preview
                  </button>
                </div>
              </div>
            ))}
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
          <i className="fas fa-comments"></i>
        </button>
        <div className="chatbot-window">
          <div className="chatbot-header">
            <i className="fas fa-robot" style={{ marginRight: '0.5rem' }}></i>
            SMAP Assistant
          </div>
          <div className="chatbot-body">
            <div style={{ color: '#2A4759', marginBottom: '1rem' }}>
              <i className="fas fa-lightbulb" style={{ marginRight: '0.5rem', color: '#F79B72' }}></i>
              Need help generating the perfect report? I can suggest the best metrics and formats for your needs!
            </div>
          </div>
          <div className="chatbot-input">
            <input type="text" placeholder="Ask about report generation..." />
            <button style={{
              background: '#F79B72',
              border: 'none',
              color: 'white',
              padding: '0.5rem',
              borderRadius: '0 4px 4px 0'
            }}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
