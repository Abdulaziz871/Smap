'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../utils/auth';
import Sidebar from '../../components/Sidebar';

export default function Reports() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube']);
  const [exportFormat, setExportFormat] = useState('CSV');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const currentUser = getCurrentUser();
      console.log('Reports page - Current user:', currentUser);
      if (!currentUser) {
        router.push('/login');
        return;
      }
      
      setUser(currentUser);
      
      // Set default date range (last 30 days)
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setEndDate(today.toISOString().split('T')[0]);
      setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      
      if (!user || !user._id) {
        alert('Please login to generate reports');
        return;
      }

      // Validate date range
      if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        alert('Start date cannot be after end date');
        return;
      }

      // Validate platforms
      if (selectedPlatforms.length === 0) {
        alert('Please select at least one platform');
        return;
      }
      
      const reportData = {
        reportType: 'performance-overview', // Default report type
        platforms: selectedPlatforms,
        metrics: ['Follower Growth', 'Engagement Rate', 'Reach & Impressions', 'Top Posts'], // Include all metrics
        startDate,
        endDate,
        format: exportFormat,
        userId: user._id
      };

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Set file extension based on format
        const fileExtension = exportFormat.toLowerCase();
        
        a.download = `SMAP_Report_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success message
        alert('Report generated successfully! Check your downloads folder.');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to generate report');
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
    <div style={{display: 'flex', minHeight: '100vh', background: '#F9FAFB'}}>
      <Sidebar activePage="reports" />

      {/* Main Content */}
      <main className="main-content" style={{background: '#F9FAFB'}}>
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
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>1</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Report Type</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <i className="fas fa-file-export" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></i>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>2</div>
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
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>CSV, PDF</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Available Formats</div>
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
                    { format: 'CSV', icon: 'fas fa-file-csv', color: '#22c55e' },
                    { format: 'PDF', icon: 'fas fa-file-pdf', color: '#dc2626' }
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
                    { platform: 'facebook', icon: 'fab fa-facebook', color: '#1877F2', name: 'Facebook' },
                    { platform: 'tiktok', icon: 'fab fa-tiktok', color: '#000000', name: 'TikTok' },
                    { platform: 'instagram', icon: 'fab fa-instagram', color: '#E4405F', name: 'Instagram (Maintenance)' }
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
                background: generatingReport ? '#DDDDDD' : 'linear-gradient(135deg, rgba(42, 71, 89) 0%, rgb(42, 71, 89) 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: generatingReport ? 'not-allowed' : 'pointer',
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
