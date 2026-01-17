'use client';

import { useState, useEffect, lazy, Suspense, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../utils/auth';
import Sidebar from '../../components/Sidebar';

// Dynamically import the Rich Text Editor to avoid SSR issues
const RichTextEditor = lazy(() => import('../../components/RichTextEditor'));

// Helper function to convert HTML to plain text for display
function htmlToPlainText(html: string): string {
  if (!html) return '';
  
  // Replace <br> and </p> with newlines
  let text = html.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  
  // Replace list items with bullet points
  text = text.replace(/<li>/gi, '• ');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  
  // Clean up multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  return text.trim();
}

// Type definitions
interface ScheduledPost {
  _id: string;
  platform: string;
  pageId?: string;
  pageName?: string;
  content: {
    message: string;
    link?: string;
    mediaUrls?: string[];
    mediaType?: string;
  };
  scheduledTime: string;
  timezone: string;
  status: string;
}

interface PostingTime {
  day: string;
  time: string;
  reason: string;
}

interface ContentRecommendation {
  type: string;
  suggestion: string;
  priority: string;
}

interface EngagementStrategy {
  strategy: string;
  expectedImpact: string;
}

interface GrowthOpportunity {
  opportunity: string;
  implementation: string;
}

interface Recommendations {
  optimalPostingTimes?: PostingTime[];
  contentRecommendations?: ContentRecommendation[];
  engagementStrategies?: EngagementStrategy[];
  growthOpportunities?: GrowthOpportunity[];
}

interface Caption {
  style: string;
  caption: string;
  hashtags?: string[];
}

interface GeneratedCaptions {
  captions: Caption[];
}

export default function SchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  
  // Scheduling state
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [newPost, setNewPost] = useState({
    platform: 'facebook',
    message: '',
    link: '',
    scheduledTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  
  // Media upload state
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Supported media types
  const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
  
  // Handle file validation and upload
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setUploadError('');
    const validFiles: File[] = [];
    const previews: string[] = [];
    
    Array.from(files).forEach((file) => {
      const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
      const isVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);
      
      if (!isImage && !isVideo) {
        setUploadError(`Unsupported file type: ${file.name}. Please upload images (JPEG, PNG, GIF, WebP) or videos (MP4, MOV, WebM).`);
        return;
      }
      
      const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
      if (file.size > maxSize) {
        setUploadError(`File too large: ${file.name}. Max size is ${isImage ? '10MB' : '100MB'}.`);
        return;
      }
      
      // Allow up to 4 images like Facebook, or 1 video
      if (isVideo && (validFiles.length >= 1 || mediaFiles.length >= 1)) {
        setUploadError('Only one video can be uploaded at a time.');
        return;
      }
      
      // Check if trying to mix video with images
      const hasExistingVideo = mediaFiles.some(f => SUPPORTED_VIDEO_TYPES.includes(f.type));
      const hasExistingImages = mediaFiles.some(f => SUPPORTED_IMAGE_TYPES.includes(f.type));
      
      if (isVideo && hasExistingImages) {
        setUploadError('Cannot mix videos with images. Please upload either images or a video.');
        return;
      }
      
      if (isImage && hasExistingVideo) {
        setUploadError('Cannot mix images with videos. Please upload either images or a video.');
        return;
      }
      
      // Limit to 4 images
      if (isImage && (validFiles.length + mediaFiles.length) >= 4) {
        setUploadError('Maximum 4 images allowed.');
        return;
      }
      
      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          previews.push(e.target.result as string);
          if (previews.length === validFiles.length) {
            setMediaPreviews(prev => [...prev, ...previews]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    
    setMediaFiles(prev => [...prev, ...validFiles]);
  }, [mediaFiles]);
  
  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);
  
  // Remove media file
  const removeMedia = useCallback((index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
    setUploadError('');
  }, []);
  
  // Get media type for the API
  const getMediaType = (): string | undefined => {
    if (mediaFiles.length === 0) return undefined;
    const file = mediaFiles[0];
    if (SUPPORTED_IMAGE_TYPES.includes(file.type)) return 'image';
    if (SUPPORTED_VIDEO_TYPES.includes(file.type)) return 'video';
    return undefined;
  };

  // AI Recommendations state
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  // Caption generation state
  const [captionTopic, setCaptionTopic] = useState('');
  const [captionPlatform, setCaptionPlatform] = useState('facebook');
  const [captionTone, setCaptionTone] = useState('professional');
  const [generatedCaptions, setGeneratedCaptions] = useState<GeneratedCaptions | null>(null);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchScheduledPosts();
    }
  }, [user]);

  const fetchScheduledPosts = async () => {
    try {
      const res = await fetch(`/api/scheduled-posts?status=scheduled&userId=${user._id}`);
      const data = await res.json();
      
      if (data.success) {
        setScheduledPosts(data.posts);
      }
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
    }
  };

  const handleSchedulePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduling(true);
    setScheduleError('');
    setScheduleSuccess('');

    try {
      // Prepare post data with media info
      const postData: any = {
        ...newPost,
        userId: user._id,
        mediaType: getMediaType(),
        hasMedia: mediaFiles.length > 0,
        mediaFileName: mediaFiles.length > 0 ? mediaFiles[0].name : undefined,
      };
      
      // If there's media, we need to upload it first or convert to base64
      // For now, we'll store base64 for images (Facebook requires URL for API)
      if (mediaFiles.length > 0 && mediaPreviews.length > 0) {
        postData.mediaUrls = mediaPreviews; // Base64 data URLs
      }
      
      const res = await fetch('/api/scheduled-posts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData),
      });

      const data = await res.json();

      if (data.success) {
        setScheduleSuccess('Post scheduled successfully!');
        setNewPost({
          platform: 'facebook',
          message: '',
          link: '',
          scheduledTime: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        // Reset media state
        setMediaFiles([]);
        setMediaPreviews([]);
        setUploadError('');
        fetchScheduledPosts();
      } else {
        setScheduleError(data.error || 'Failed to schedule post');
      }
    } catch (err) {
      const error = err as Error;
      setScheduleError(error.message);
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelPost = async (postId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled post?')) return;

    try {
      const res = await fetch(`/api/scheduled-posts?postId=${postId}&userId=${user._id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        fetchScheduledPosts();
      } else {
        alert(data.error || 'Failed to cancel post');
      }
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  };

  const handlePublishNow = async (postId: string) => {
    if (!confirm('Publish this post to Facebook now?')) return;

    try {
      const res = await fetch('/api/scheduled-posts/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, userId: user._id })
      });

      const data = await res.json();

      if (data.success) {
        alert('Post published successfully!');
        fetchScheduledPosts();
      } else {
        alert(data.error || 'Failed to publish post');
      }
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  };

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    setRecommendationsError('');

    try {
      const res = await fetch(`/api/ai/recommendations?platform=${selectedPlatform}&userId=${user._id}`);
      const data = await res.json();

      if (data.success) {
        setRecommendations(data.recommendations);
      } else {
        setRecommendationsError(data.error || 'Failed to get recommendations');
      }
    } catch (err) {
      const error = err as Error;
      setRecommendationsError(error.message);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const generateCaptions = async () => {
    if (!captionTopic.trim()) {
      alert('Please enter a topic for caption generation');
      return;
    }

    setGeneratingCaptions(true);

    try {
      const res = await fetch('/api/ai/captions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user._id,
          topic: captionTopic,
          platform: captionPlatform,
          tone: captionTone,
          includeHashtags: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedCaptions(data.suggestions);
      } else {
        alert(data.error || 'Failed to generate captions');
      }
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    } finally {
      setGeneratingCaptions(false);
    }
  };

  const useCaption = (caption: Caption) => {
    const hashtags = caption.hashtags?.join(' ') || '';
    setNewPost({
      ...newPost,
      message: `${caption.caption}\n\n${hashtags}`,
    });
    setActiveTab('schedule');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#F9FAFB',
        color: '#2A4759',
        fontSize: '1.5rem'
      }}>
        <i className="fas fa-spinner fa-spin" style={{ marginRight: '1rem' }}></i>
        Loading...
      </div>
    );
  }

  return (
    <div style={{display: 'flex', minHeight: '100vh', background: '#F9FAFB'}}>
      <Sidebar activePage="schedule" />

      {/* Main Content */}
      <main className="main-content" style={{background: '#F9FAFB', flex: 1, padding: '2rem'}}>
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
            <i className="fas fa-robot" style={{ fontSize: '2rem', marginRight: '1rem' }}></i>
            <div>
              <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>
                Schedule & AI
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem', opacity: 0.9 }}>
                Schedule posts and get AI-powered content recommendations
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
              <i className="fas fa-calendar-alt" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></i>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{scheduledPosts.length}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Scheduled Posts</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <i className="fas fa-brain" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></i>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>AI</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Recommendations</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <i className="fas fa-magic" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></i>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Smart</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Caption Generator</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('schedule')}
            style={{
              padding: '1rem 2rem',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: activeTab === 'schedule' 
                ? 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)' 
                : 'white',
              color: activeTab === 'schedule' ? 'white' : '#2A4759',
              boxShadow: activeTab === 'schedule' 
                ? '0 4px 12px rgba(247, 155, 114, 0.4)' 
                : '0 2px 8px rgba(42, 71, 89, 0.1)'
            }}
          >
            <i className="fas fa-calendar-plus" style={{ marginRight: '0.5rem' }}></i>
            Schedule Post
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            style={{
              padding: '1rem 2rem',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: activeTab === 'recommendations' 
                ? 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)' 
                : 'white',
              color: activeTab === 'recommendations' ? 'white' : '#2A4759',
              boxShadow: activeTab === 'recommendations' 
                ? '0 4px 12px rgba(247, 155, 114, 0.4)' 
                : '0 2px 8px rgba(42, 71, 89, 0.1)'
            }}
          >
            <i className="fas fa-robot" style={{ marginRight: '0.5rem' }}></i>
            AI Recommendations
          </button>
          <button
            onClick={() => setActiveTab('captions')}
            style={{
              padding: '1rem 2rem',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: activeTab === 'captions' 
                ? 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)' 
                : 'white',
              color: activeTab === 'captions' ? 'white' : '#2A4759',
              boxShadow: activeTab === 'captions' 
                ? '0 4px 12px rgba(247, 155, 114, 0.4)' 
                : '0 2px 8px rgba(42, 71, 89, 0.1)'
            }}
          >
            <i className="fas fa-pen-fancy" style={{ marginRight: '0.5rem' }}></i>
            Caption Generator
          </button>
        </div>

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '2rem'
          }}>
            {/* New Post Form */}
            <div style={{
              background: 'linear-gradient(135deg, #EEEEEE 0%, #DDDDDD 100%)',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 4px 16px rgba(42, 71, 89, 0.1)',
              border: '1px solid rgba(247, 155, 114, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <i className="fas fa-plus-circle" style={{ fontSize: '1.5rem', color: '#F79B72', marginRight: '1rem' }}></i>
                <h2 style={{ color: '#2A4759', margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                  Schedule New Post
                </h2>
              </div>

              {scheduleError && (
                <div style={{
                  background: 'rgba(220, 53, 69, 0.1)',
                  border: '1px solid #dc3545',
                  color: '#dc3545',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
                  {scheduleError}
                </div>
              )}

              {scheduleSuccess && (
                <div style={{
                  background: 'rgba(40, 167, 69, 0.1)',
                  border: '1px solid #28a745',
                  color: '#28a745',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i>
                  {scheduleSuccess}
                </div>
              )}

              <form onSubmit={handleSchedulePost}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: '#2A4759', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Platform
                  </label>
                  <select
                    value={newPost.platform}
                    onChange={(e) => setNewPost({ ...newPost, platform: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #ccc',
                      background: 'white',
                      color: '#2A4759',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="facebook">Facebook</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: '#2A4759', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Message
                  </label>
                  <Suspense fallback={
                    <div style={{
                      width: '100%',
                      minHeight: '200px',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #ccc',
                      background: '#f8f9fa',
                      color: '#999',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      Loading editor...
                    </div>
                  }>
                    <RichTextEditor
                      value={newPost.message}
                      onChange={(html) => setNewPost({ ...newPost, message: html })}
                      placeholder="What's on your mind?"
                    />
                  </Suspense>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: '#2A4759', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={newPost.link}
                    onChange={(e) => setNewPost({ ...newPost, link: e.target.value })}
                    placeholder="https://..."
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #ccc',
                      background: 'white',
                      color: '#2A4759',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                {/* Media Upload Section */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: '#2A4759', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Media (Optional)
                  </label>
                  
                  {/* Error message */}
                  {uploadError && (
                    <div style={{
                      background: '#fff5f5',
                      border: '1px solid #dc3545',
                      color: '#dc3545',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      marginBottom: '0.75rem',
                      fontSize: '0.875rem'
                    }}>
                      <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
                      {uploadError}
                    </div>
                  )}
                  
                  {/* Media Preview */}
                  {mediaPreviews.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      {mediaPreviews.map((preview, index) => (
                        <div key={index} style={{
                          position: 'relative',
                          display: 'inline-block',
                          marginRight: '0.5rem',
                          marginBottom: '0.5rem'
                        }}>
                          {mediaFiles[index]?.type.startsWith('video/') ? (
                            <video
                              src={preview}
                              style={{
                                width: '150px',
                                height: '150px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '2px solid #3FC1C9'
                              }}
                            />
                          ) : (
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              style={{
                                width: '150px',
                                height: '150px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '2px solid #3FC1C9'
                              }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeMedia(index)}
                            style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '-8px',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            ×
                          </button>
                          <div style={{
                            position: 'absolute',
                            bottom: '4px',
                            left: '4px',
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            textTransform: 'uppercase'
                          }}>
                            {mediaFiles[index]?.type.startsWith('video/') ? (
                              <><i className="fas fa-video" style={{ marginRight: '4px' }}></i>Video</>
                            ) : (
                              <><i className="fas fa-image" style={{ marginRight: '4px' }}></i>Image</>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Drag and Drop Zone */}
                  {(mediaPreviews.length === 0 || (mediaPreviews.length < 4 && !mediaFiles.some(f => f.type.startsWith('video/')))) && (
                    <div
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: `2px dashed ${isDragging ? '#3FC1C9' : '#ccc'}`,
                        borderRadius: '12px',
                        padding: mediaPreviews.length > 0 ? '1rem' : '2rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: isDragging ? 'rgba(63, 193, 201, 0.1)' : '#fafafa',
                        transition: 'all 0.2s ease',
                        marginTop: mediaPreviews.length > 0 ? '0.75rem' : 0
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
                        onChange={(e) => handleFileSelect(e.target.files)}
                        style={{ display: 'none' }}
                      />
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3FC1C9 0%, #2A4759 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem'
                      }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                      </div>
                      <p style={{
                        color: '#2A4759',
                        fontSize: '1rem',
                        fontWeight: '600',
                        margin: '0 0 0.5rem'
                      }}>
                        {isDragging ? 'Drop your file here' : mediaPreviews.length > 0 ? `Add more images (${mediaPreviews.length}/4)` : 'Drag & drop or click to upload'}
                      </p>
                      <p style={{
                        color: '#888',
                        fontSize: '0.875rem',
                        margin: 0
                      }}>
                        {mediaPreviews.length > 0 ? 'Click or drag to add more images' : 'Supports: Images (JPEG, PNG, GIF, WebP) & Videos (MP4, MOV, WebM)'}
                      </p>
                      {mediaPreviews.length === 0 && (
                        <p style={{
                          color: '#aaa',
                          fontSize: '0.75rem',
                          margin: '0.5rem 0 0'
                        }}>
                          Max: 4 images or 1 video • 10MB for images, 100MB for videos
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Note about Facebook media */}
                  {mediaFiles.length > 0 && (
                    <p style={{
                      color: '#E8AA42',
                      fontSize: '0.75rem',
                      marginTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <i className="fas fa-info-circle"></i>
                      Note: Media will be saved locally. For Facebook publishing, media must be hosted online.
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: '#2A4759', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Schedule Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newPost.scheduledTime}
                    onChange={(e) => setNewPost({ ...newPost, scheduledTime: e.target.value })}
                    min={new Date().toISOString().slice(0, 16)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #ccc',
                      background: 'white',
                      color: '#2A4759',
                      fontSize: '1rem'
                    }}
                    required
                  />
                  <p style={{ color: '#666', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
                    Timezone: {newPost.timezone}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={scheduling}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: scheduling 
                      ? '#ccc' 
                      : 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: scheduling ? 'not-allowed' : 'pointer',
                    boxShadow: scheduling ? 'none' : '0 4px 12px rgba(247, 155, 114, 0.4)'
                  }}
                >
                  {scheduling ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-calendar-plus" style={{ marginRight: '0.5rem' }}></i>
                      Schedule Post
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Scheduled Posts List */}
            <div style={{
              background: 'linear-gradient(135deg, #EEEEEE 0%, #DDDDDD 100%)',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 4px 16px rgba(42, 71, 89, 0.1)',
              border: '1px solid rgba(247, 155, 114, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <i className="fas fa-clock" style={{ fontSize: '1.5rem', color: '#F79B72', marginRight: '1rem' }}></i>
                <h2 style={{ color: '#2A4759', margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                  Upcoming Posts ({scheduledPosts.length})
                </h2>
              </div>

              {scheduledPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                  <i className="fas fa-inbox" style={{ fontSize: '3rem', marginBottom: '1rem', color: '#ccc' }}></i>
                  <p>No scheduled posts yet</p>
                </div>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {scheduledPosts.map((post) => (
                    <div key={post._id} style={{
                      background: 'white',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      boxShadow: '0 2px 8px rgba(42, 71, 89, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{
                          background: 'linear-gradient(135deg, #1877F2 0%, #0a5dc2 100%)',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          <i className="fab fa-facebook" style={{ marginRight: '0.25rem' }}></i>
                          {post.platform}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handlePublishNow(post._id)}
                            style={{
                              background: 'linear-gradient(135deg, #28a745 0%, #218838 100%)',
                              border: 'none',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}
                          >
                            <i className="fas fa-paper-plane" style={{ marginRight: '0.25rem' }}></i>
                            Publish Now
                          </button>
                          <button
                            onClick={() => handleCancelPost(post._id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc3545',
                              cursor: 'pointer',
                              fontSize: '0.875rem'
                            }}
                          >
                            <i className="fas fa-times" style={{ marginRight: '0.25rem' }}></i>
                            Cancel
                          </button>
                        </div>
                      </div>
                      <p style={{
                        color: '#2A4759',
                        fontSize: '0.9rem',
                        marginBottom: '0.5rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {htmlToPlainText(post.content.message)}
                      </p>
                      <p style={{ color: '#666', fontSize: '0.8rem', margin: 0 }}>
                        <i className="fas fa-calendar" style={{ marginRight: '0.25rem' }}></i>
                        {new Date(post.scheduledTime).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div style={{
            background: 'linear-gradient(135deg, #EEEEEE 0%, #DDDDDD 100%)',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 4px 16px rgba(42, 71, 89, 0.1)',
            border: '1px solid rgba(247, 155, 114, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <i className="fas fa-robot" style={{ fontSize: '1.5rem', color: '#F79B72', marginRight: '1rem' }}></i>
                <h2 style={{ color: '#2A4759', margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                  AI-Powered Recommendations
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                    background: 'white',
                    color: '#2A4759',
                    fontSize: '1rem'
                  }}
                >
                  <option value="all">All Platforms</option>
                  <option value="facebook">Facebook</option>
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                </select>
                <button
                  onClick={fetchRecommendations}
                  disabled={loadingRecommendations}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: loadingRecommendations 
                      ? '#ccc' 
                      : 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: loadingRecommendations ? 'not-allowed' : 'pointer',
                    boxShadow: loadingRecommendations ? 'none' : '0 4px 12px rgba(247, 155, 114, 0.4)'
                  }}
                >
                  {loadingRecommendations ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic" style={{ marginRight: '0.5rem' }}></i>
                      Get Recommendations
                    </>
                  )}
                </button>
              </div>
            </div>

            {recommendationsError && (
              <div style={{
                background: 'rgba(220, 53, 69, 0.1)',
                border: '1px solid #dc3545',
                color: '#dc3545',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
                {recommendationsError}
              </div>
            )}

            {!recommendations && !loadingRecommendations && (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
                <i className="fas fa-lightbulb" style={{ fontSize: '4rem', marginBottom: '1rem', color: '#F79B72' }}></i>
                <h3 style={{ color: '#2A4759', marginBottom: '0.5rem' }}>Get AI-Powered Content Recommendations</h3>
                <p>Click the button above to analyze your engagement data and get personalized recommendations</p>
              </div>
            )}

            {loadingRecommendations && (
              <div style={{ textAlign: 'center', padding: '4rem' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '3rem', color: '#F79B72', marginBottom: '1rem' }}></i>
                <p style={{ color: '#2A4759' }}>Analyzing your engagement data...</p>
              </div>
            )}

            {recommendations && !loadingRecommendations && (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Optimal Posting Times */}
                {recommendations.optimalPostingTimes && recommendations.optimalPostingTimes.length > 0 && (
                  <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(42, 71, 89, 0.1)' }}>
                    <h3 style={{ color: '#2A4759', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center' }}>
                      <i className="fas fa-clock" style={{ color: '#F79B72', marginRight: '0.75rem' }}></i>
                      Optimal Posting Times
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                      {recommendations.optimalPostingTimes.map((item, index) => (
                        <div key={index} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '1rem', borderLeft: '4px solid #F79B72' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: '600', color: '#2A4759' }}>{item.day}</span>
                            <span style={{ color: '#28a745', fontWeight: '600' }}>{item.time}</span>
                          </div>
                          <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Recommendations */}
                {recommendations.contentRecommendations && recommendations.contentRecommendations.length > 0 && (
                  <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(42, 71, 89, 0.1)' }}>
                    <h3 style={{ color: '#2A4759', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center' }}>
                      <i className="fas fa-pen" style={{ color: '#F79B72', marginRight: '0.75rem' }}></i>
                      Content Recommendations
                    </h3>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {recommendations.contentRecommendations.map((item, index) => (
                        <div key={index} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'flex-start' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            marginRight: '1rem',
                            background: item.priority === 'high' ? '#dc3545' : item.priority === 'medium' ? '#ffc107' : '#6c757d',
                            color: item.priority === 'medium' ? '#000' : '#fff'
                          }}>
                            {item.type}
                          </span>
                          <p style={{ color: '#2A4759', margin: 0 }}>{item.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engagement Strategies */}
                {recommendations.engagementStrategies && recommendations.engagementStrategies.length > 0 && (
                  <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(42, 71, 89, 0.1)' }}>
                    <h3 style={{ color: '#2A4759', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center' }}>
                      <i className="fas fa-chart-line" style={{ color: '#F79B72', marginRight: '0.75rem' }}></i>
                      Engagement Strategies
                    </h3>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {recommendations.engagementStrategies.map((item, index) => (
                        <div key={index} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '1rem' }}>
                          <p style={{ color: '#2A4759', fontWeight: '600', margin: '0 0 0.5rem 0' }}>{item.strategy}</p>
                          <p style={{ color: '#666', margin: 0, fontSize: '0.875rem' }}>
                            <i className="fas fa-arrow-up" style={{ color: '#28a745', marginRight: '0.5rem' }}></i>
                            Expected Impact: {item.expectedImpact}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Growth Opportunities */}
                {recommendations.growthOpportunities && recommendations.growthOpportunities.length > 0 && (
                  <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(42, 71, 89, 0.1)' }}>
                    <h3 style={{ color: '#2A4759', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center' }}>
                      <i className="fas fa-rocket" style={{ color: '#F79B72', marginRight: '0.75rem' }}></i>
                      Growth Opportunities
                    </h3>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {recommendations.growthOpportunities.map((item, index) => (
                        <div key={index} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '1rem' }}>
                          <p style={{ color: '#2A4759', fontWeight: '600', margin: '0 0 0.5rem 0' }}>{item.opportunity}</p>
                          <p style={{ color: '#666', margin: 0, fontSize: '0.875rem' }}>{item.implementation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Caption Generator Tab */}
        {activeTab === 'captions' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '2rem'
          }}>
            {/* Generator Form */}
            <div style={{
              background: 'linear-gradient(135deg, #EEEEEE 0%, #DDDDDD 100%)',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 4px 16px rgba(42, 71, 89, 0.1)',
              border: '1px solid rgba(247, 155, 114, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <i className="fas fa-pen-fancy" style={{ fontSize: '1.5rem', color: '#F79B72', marginRight: '1rem' }}></i>
                <h2 style={{ color: '#2A4759', margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                  AI Caption Generator
                </h2>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#2A4759', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Topic / Description
                </label>
                <textarea
                  value={captionTopic}
                  onChange={(e) => setCaptionTopic(e.target.value)}
                  placeholder="Describe what your post is about..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                    background: 'white',
                    color: '#2A4759',
                    fontSize: '1rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#2A4759', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Platform
                  </label>
                  <select
                    value={captionPlatform}
                    onChange={(e) => setCaptionPlatform(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #ccc',
                      background: 'white',
                      color: '#2A4759',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#2A4759', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Tone
                  </label>
                  <select
                    value={captionTone}
                    onChange={(e) => setCaptionTone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #ccc',
                      background: 'white',
                      color: '#2A4759',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="humorous">Humorous</option>
                    <option value="inspirational">Inspirational</option>
                    <option value="educational">Educational</option>
                  </select>
                </div>
              </div>

              <button
                onClick={generateCaptions}
                disabled={generatingCaptions || !captionTopic.trim()}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: (generatingCaptions || !captionTopic.trim())
                    ? '#ccc' 
                    : 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: (generatingCaptions || !captionTopic.trim()) ? 'not-allowed' : 'pointer',
                  boxShadow: (generatingCaptions || !captionTopic.trim()) ? 'none' : '0 4px 12px rgba(155, 89, 182, 0.4)'
                }}
              >
                {generatingCaptions ? (
                  <>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic" style={{ marginRight: '0.5rem' }}></i>
                    Generate Captions
                  </>
                )}
              </button>
            </div>

            {/* Generated Captions */}
            <div style={{
              background: 'linear-gradient(135deg, #EEEEEE 0%, #DDDDDD 100%)',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 4px 16px rgba(42, 71, 89, 0.1)',
              border: '1px solid rgba(247, 155, 114, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <i className="fas fa-list-alt" style={{ fontSize: '1.5rem', color: '#F79B72', marginRight: '1rem' }}></i>
                <h2 style={{ color: '#2A4759', margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                  Generated Captions
                </h2>
              </div>

              {!generatedCaptions && !generatingCaptions && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                  <i className="fas fa-pencil-alt" style={{ fontSize: '3rem', marginBottom: '1rem', color: '#ccc' }}></i>
                  <p>Enter a topic and click generate to get AI-powered captions</p>
                </div>
              )}

              {generatingCaptions && (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '3rem', color: '#9b59b6', marginBottom: '1rem' }}></i>
                  <p style={{ color: '#2A4759' }}>Generating captions...</p>
                </div>
              )}

              {generatedCaptions && generatedCaptions.captions && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {generatedCaptions.captions.map((caption, index) => (
                    <div key={index} style={{
                      background: 'white',
                      borderRadius: '8px',
                      padding: '1rem',
                      boxShadow: '0 2px 8px rgba(42, 71, 89, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{
                          background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          textTransform: 'capitalize'
                        }}>
                          {caption.style}
                        </span>
                        <button
                          onClick={() => useCaption(caption)}
                          style={{
                            background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
                            border: 'none',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                          }}
                        >
                          <i className="fas fa-arrow-right" style={{ marginRight: '0.25rem' }}></i>
                          Use this caption
                        </button>
                      </div>
                      <p style={{ color: '#2A4759', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{caption.caption}</p>
                      {caption.hashtags && caption.hashtags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {caption.hashtags.map((tag, i) => (
                            <span key={i} style={{
                              color: '#1877F2',
                              fontSize: '0.8rem',
                              background: 'rgba(24, 119, 242, 0.1)',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px'
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
