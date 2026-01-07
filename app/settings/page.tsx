'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import { getCurrentUser } from '../../utils/auth';

export default function Settings() {
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    profilePicture: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        window.location.href = '/login';
        return;
      }

      const response = await fetch('/api/user/profile', {
        headers: {
          'x-user-id': currentUser._id
        }
      });

      const data = await response.json();
      console.log('Fetched user profile data:', data);
      
      if (data.success) {
        const profileData = {
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          email: data.user.email || currentUser.email || '',
          company: data.user.company || '',
          profilePicture: data.user.profilePicture || null
        };
        console.log('Setting user data:', profileData);
        setUserData(profileData);
      } else {
        console.error('Failed to fetch profile:', data.error);
        // Fallback to currentUser data from localStorage
        setUserData({
          firstName: currentUser.firstName || '',
          lastName: currentUser.lastName || '',
          email: currentUser.email || '',
          company: currentUser.company || '',
          profilePicture: currentUser.profilePicture || null
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 5MB' });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUserData(prev => ({ ...prev, profilePicture: base64String }));
        setMessage({ type: 'success', text: 'Photo uploaded! Click Save Changes to update.' });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage({ type: 'error', text: 'Failed to upload photo' });
    }
  };

  const handleRemovePhoto = () => {
    setUserData(prev => ({ ...prev, profilePicture: null }));
    setMessage({ type: 'success', text: 'Photo removed! Click Save Changes to update.' });
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      const currentUser = getCurrentUser();
      console.log('Current user from localStorage:', currentUser);
      
      if (!currentUser) {
        window.location.href = '/login';
        return;
      }

      const updatePayload = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        company: userData.company,
        profilePicture: userData.profilePicture
      };
      
      console.log('Sending update request:', updatePayload);
      console.log('User ID:', currentUser._id);

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
        body: JSON.stringify(updatePayload)
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        
        // Update localStorage with new data
        const updatedUser = { ...currentUser, ...data.user };
        localStorage.setItem('smap_user', JSON.stringify(updatedUser));
      } else {
        console.error('Update failed:', data.error);
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Failed to save changes: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    const first = userData.firstName?.charAt(0)?.toUpperCase() || '';
    const last = userData.lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || userData.email?.charAt(0)?.toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div style={{display: 'flex', minHeight: '100vh', background: '#F9FAFB'}}>
        <Sidebar activePage="settings" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '3rem', color: '#F79B72' }}></i>
            <p style={{ marginTop: '1rem', color: '#6B7280' }}>Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{display: 'flex', minHeight: '100vh', background: '#F9FAFB'}}>
      <Sidebar activePage="settings" />

      {/* Main Content */}
      <main className="main-content" style={{
        flex: 1,
        padding: '2rem',
        background: '#f8fafc'
      }}>
        {/* Modern Gradient Header */}
        <div style={{
          background: 'linear-gradient(135deg, #2A4759 0%, #1e3a52 100%)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          color: 'white',
          boxShadow: '0 8px 32px rgba(42, 71, 89, 0.3)',
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
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <i className="fas fa-cog" style={{ 
                fontSize: '2rem', 
                marginRight: '1rem',
                color: '#F79B72'
              }}></i>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: '700', 
                margin: 0,
                background: 'linear-gradient(45deg, #F79B72 0%, #e8845c 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Account Settings
              </h1>
            </div>
            <p style={{ 
              fontSize: '1.1rem', 
              margin: 0,
              color: 'rgba(255,255,255,0.9)',
              fontWeight: '400'
            }}>
              Manage your profile, security settings, and account preferences.
            </p>
          </div>
        </div>

        {/* Profile Settings */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
            <i className="fas fa-user" style={{ 
              fontSize: '1.5rem', 
              marginRight: '0.75rem',
              color: '#F79B72'
            }}></i>
            <h2 style={{
              color: '#1F2937', 
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: 0
            }}>
              Profile Information
            </h2>
          </div>
          
          <div style={{display: 'grid', gap: '2rem'}}>
            {/* Profile Picture */}
            <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
              <div style={{
                width: '100px',
                height: '100px',
                background: userData.profilePicture 
                  ? `url(${userData.profilePicture})` 
                  : 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(247, 155, 114, 0.3)'
              }}>
                {!userData.profilePicture && getInitials()}
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1F2937', fontSize: '1.1rem' }}>
                  Profile Picture
                </h3>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    type="button"
                    onClick={handleFileUpload}
                    style={{
                      padding: '0.75rem 1.25rem',
                      background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(247, 155, 114, 0.3)'
                    }}>
                    <i className="fas fa-upload"></i>
                    Upload Photo
                  </button>
                  <button 
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{
                      padding: '0.75rem 1.25rem',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}>
                    <i className="fas fa-trash"></i>
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {/* Name Fields */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem'}}>
              <div>
                <label style={{
                  display: 'block',
                  color: '#374151',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  fontSize: '0.95rem'
                }}>
                  <i className="fas fa-user" style={{ marginRight: '0.5rem', color: '#F79B72' }}></i>
                  First Name
                </label>
                <input 
                  type="text" 
                  value={userData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder={userData.firstName || "Enter your first name"}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#1F2937',
                    fontSize: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#F79B72';
                    e.target.style.boxShadow = '0 0 0 3px rgba(247, 155, 114, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  color: '#374151',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  fontSize: '0.95rem'
                }}>
                  <i className="fas fa-user" style={{ marginRight: '0.5rem', color: '#F79B72' }}></i>
                  Last Name
                </label>
                <input 
                  type="text" 
                  value={userData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder={userData.lastName || "Enter your last name"}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#1F2937',
                    fontSize: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#F79B72';
                    e.target.style.boxShadow = '0 0 0 3px rgba(247, 155, 114, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Email and Company */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem'}}>
              <div>
                <label style={{
                  display: 'block',
                  color: '#374151',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  fontSize: '0.95rem'
                }}>
                  <i className="fas fa-envelope" style={{ marginRight: '0.5rem', color: '#F79B72' }}></i>
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={userData.email}
                  disabled
                  placeholder={userData.email || "Your email address"}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: '#f9fafb',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#6B7280',
                    fontSize: '1rem',
                    cursor: 'not-allowed',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  color: '#374151',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  fontSize: '0.95rem'
                }}>
                  <i className="fas fa-building" style={{ marginRight: '0.5rem', color: '#F79B72' }}></i>
                  Company/Organization
                </label>
                <input 
                  type="text" 
                  value={userData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder={userData.company || "Enter your company name"}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#1F2937',
                    fontSize: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#F79B72';
                    e.target.style.boxShadow = '0 0 0 3px rgba(247, 155, 114, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Success/Error Message */}
            {message.text && (
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                border: `2px solid ${message.type === 'success' ? '#6ee7b7' : '#fca5a5'}`,
                color: message.type === 'success' ? '#065f46' : '#991b1b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
                {message.text}
              </div>
            )}

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button 
                onClick={handleSaveChanges}
                disabled={saving}
                style={{
                  padding: '0.875rem 2rem',
                  background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 8px rgba(247, 155, 114, 0.3)',
                  transition: 'all 0.2s ease'
                }}>
                <i className={`fas fa-${saving ? 'spinner fa-spin' : 'save'}`}></i>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
            <i className="fas fa-shield-alt" style={{ 
              fontSize: '1.5rem', 
              marginRight: '0.75rem',
              color: '#F79B72'
            }}></i>
            <h2 style={{
              color: '#1F2937', 
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: 0
            }}>
              Security & Privacy
            </h2>
          </div>
          
          <div style={{display: 'grid', gap: '2rem'}}>
            {/* Change Password */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <i className="fas fa-key" style={{ 
                  fontSize: '1.25rem', 
                  marginRight: '0.75rem',
                  color: '#F79B72'
                }}></i>
                <h3 style={{
                  color: '#374151', 
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  margin: 0
                }}>
                  Change Password
                </h3>
              </div>
              <div style={{display: 'grid', gap: '1.5rem', maxWidth: '500px'}}>
                <input 
                  type="password" 
                  placeholder="Current Password"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#1F2937',
                    fontSize: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#F79B72';
                    e.target.style.boxShadow = '0 0 0 3px rgba(247, 155, 114, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <input 
                    type="password" 
                    placeholder="New Password"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      color: '#1F2937',
                      fontSize: '1rem',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#F79B72';
                      e.target.style.boxShadow = '0 0 0 3px rgba(247, 155, 114, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <input 
                    type="password" 
                    placeholder="Confirm New Password"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      color: '#1F2937',
                      fontSize: '1rem',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#F79B72';
                      e.target.style.boxShadow = '0 0 0 3px rgba(247, 155, 114, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <button style={{
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  width: 'fit-content',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 8px rgba(247, 155, 114, 0.3)',
                  transition: 'all 0.2s ease'
                }}>
                  <i className="fas fa-sync-alt"></i>
                  Update Password
                </button>
              </div>
            </div>

            {/* Security Options Grid */}
            <div style={{display: 'grid', gap: '1.5rem'}}>
              {/* Two-Factor Authentication */}
              <div style={{
                padding: '1.5rem',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                transition: 'all 0.2s ease'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <i className="fas fa-mobile-alt" style={{ 
                      fontSize: '1.5rem', 
                      marginRight: '1rem',
                      color: '#10b981'
                    }}></i>
                    <div>
                      <h4 style={{margin: 0, color: '#1F2937', fontSize: '1.1rem', fontWeight: '600'}}>
                        Two-Factor Authentication
                      </h4>
                      <p style={{margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.95rem'}}>
                        Add an extra layer of security to your account
                      </p>
                    </div>
                  </div>
                  <button style={{
                    padding: '0.75rem 1.25rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}>
                    <i className="fas fa-plus"></i>
                    Enable 2FA
                  </button>
                </div>
              </div>

              {/* Data Export */}
              <div style={{
                padding: '1.5rem',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                transition: 'all 0.2s ease'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <i className="fas fa-download" style={{ 
                      fontSize: '1.5rem', 
                      marginRight: '1rem',
                      color: '#F79B72'
                    }}></i>
                    <div>
                      <h4 style={{margin: 0, color: '#1F2937', fontSize: '1.1rem', fontWeight: '600'}}>
                        Export Your Data
                      </h4>
                      <p style={{margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.95rem'}}>
                        Download a copy of all your data and reports
                      </p>
                    </div>
                  </div>
                  <button style={{
                    padding: '0.75rem 1.25rem',
                    background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(247, 155, 114, 0.3)'
                  }}>
                    <i className="fas fa-file-export"></i>
                    Request Export
                  </button>
                </div>
              </div>

              {/* Delete Account */}
              <div style={{
                padding: '1.5rem',
                background: '#fef2f2',
                borderRadius: '12px',
                border: '2px solid #fca5a5',
                transition: 'all 0.2s ease'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <i className="fas fa-exclamation-triangle" style={{ 
                      fontSize: '1.5rem', 
                      marginRight: '1rem',
                      color: '#dc2626'
                    }}></i>
                    <div>
                      <h4 style={{margin: 0, color: '#dc2626', fontSize: '1.1rem', fontWeight: '600'}}>
                        Delete Account
                      </h4>
                      <p style={{margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.95rem'}}>
                        Permanently delete your account and all associated data
                      </p>
                    </div>
                  </div>
                  <button style={{
                    padding: '0.75rem 1.25rem',
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}>
                    <i className="fas fa-trash"></i>
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
