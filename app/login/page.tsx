'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data in localStorage
        localStorage.setItem('smap_user', JSON.stringify(data.user));
        localStorage.setItem('user', JSON.stringify(data.user)); // legacy key for compatibility
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-container">
      <div className="form-container">
        <h2 className="text-center mb-2" style={{ color: '#2A4759', fontSize: '2rem', fontWeight: '700' }}>
          Welcome Back
        </h2>
        <p className="text-center mb-2" style={{ color: '#2A4759', opacity: 0.7 }}>
          Sign in to your SMAP account
        </p>
        
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#dc2626',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <input 
            className="input-field"
            type="email" 
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            required 
            disabled={loading}
          />
          
          <input 
            className="input-field"
            type="password" 
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required 
            disabled={loading}
          />
          
          <button 
            className="btn-primary w-full mb-1" 
            type="submit"
            disabled={loading}
            style={{
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        <div className="text-center" style={{ marginBottom: '1rem' }}>
          <a href="/forgot-password" style={{ color: '#2A4759', fontSize: '0.9rem' }}>
            Forgot your password?
          </a>
        </div>
        
        <div className="text-center" style={{ padding: '1rem 0', borderTop: '1px solid #e0e0e0' }}>
          <span style={{ color: '#2A4759', fontSize: '0.9rem' }}>Don't have an account? </span>
          <a href="/register" style={{ color: '#F79B72', fontWeight: '600' }}>
            Create Account
          </a>
        </div>
        
        <div className="text-center mt-1">
          <a href="/" style={{ color: '#2A4759', fontSize: '0.9rem' }}>← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
