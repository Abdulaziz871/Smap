'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    userName: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setSuccess('');

    // Basic validation
    if (!formData.fullName || !formData.email || !formData.userName || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Split full name into first and last name
      const nameParts = formData.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: formData.userName,
          email: formData.email,
          password: formData.password,
          firstName,
          lastName
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Account created successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-container">
      <div className="form-container" style={{ maxWidth: '450px' }}>
        <h2 className="text-center mb-1" style={{ color: '#2A4759', fontSize: '2rem', fontWeight: '700' }}>
          Join SMAP
        </h2>
        <p className="text-center mb-2" style={{ color: '#2A4759', opacity: 0.7 }}>
          Create your account and start analyzing
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
        
        {success && (
          <div style={{
            background: '#d1fae5',
            border: '1px solid #86efac',
            color: '#16a34a',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <input 
            className="input-field"
            type="text" 
            name="fullName"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={handleChange}
            required 
            disabled={loading}
          />
          
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
            type="text" 
            name="userName"
            placeholder="Username"
            value={formData.userName}
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
          
          <input 
            className="input-field"
            type="password" 
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="text-center" style={{ padding: '1rem 0', borderTop: '1px solid #e0e0e0' }}>
          <span style={{ color: '#2A4759', fontSize: '0.9rem' }}>Already have an account? </span>
          <a href="/login" style={{ color: '#F79B72', fontWeight: '600' }}>
            Sign In
          </a>
        </div>
        
        <div className="text-center mt-1">
          <a href="/" style={{ color: '#2A4759', fontSize: '0.9rem' }}>← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
