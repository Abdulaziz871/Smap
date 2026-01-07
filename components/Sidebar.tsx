'use client';

import { useRouter } from 'next/navigation';

interface SidebarProps {
  activePage: string;
}

export default function Sidebar({ activePage }: SidebarProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const isActive = (page: string) => activePage === page;

  return (
    <aside className="sidebar" style={{
      background: 'linear-gradient(180deg, #2A4759 0%, #1e3a52 100%)',
      boxShadow: '2px 0 10px rgba(42, 71, 89, 0.15)',
      width: '280px',
      borderRight: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      {/* Brand Section */}
      <div className="sidebar-brand" style={{
        padding: '2.5rem 2rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(247, 155, 114, 0.2)'
        }}>
          <h2 style={{
            color: 'white',
            margin: 0,
            fontSize: '1.8rem',
            fontWeight: '700',
            letterSpacing: '2px'
          }}>SMAP</h2>
        </div>
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)', 
          margin: 0, 
          fontSize: '0.875rem',
          textAlign: 'center',
          fontWeight: '400',
          letterSpacing: '0.5px'
        }}>
          Social Media Analytics Platform
        </p>
      </div>

      {/* Navigation Section */}
      <nav style={{padding: '1.5rem 0', flex: 1}}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: '600',
          color: 'rgba(255, 255, 255, 0.5)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          padding: '0 2rem 1rem 2rem'
        }}>
          Main Menu
        </div>
        <ul className="sidebar-nav" style={{listStyle: 'none', padding: 0, margin: 0}}>
          <li style={{margin: '0.25rem 1rem'}}>
            <a href="/dashboard" style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.875rem 1rem',
              color: isActive('dashboard') ? 'white' : 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              background: isActive('dashboard') ? 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)' : 'transparent',
              borderRadius: '8px',
              fontWeight: isActive('dashboard') ? '600' : '500',
              fontSize: '0.95rem',
              boxShadow: isActive('dashboard') ? '0 2px 8px rgba(247, 155, 114, 0.2)' : 'none',
              transition: 'all 0.3s ease'
            }} onMouseOver={(e) => {
              if (!isActive('dashboard')) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateX(2px)';
              }
            }} onMouseOut={(e) => {
              if (!isActive('dashboard')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.transform = 'translateX(0)';
              }
            }}>
              <i className="fas fa-chart-line" style={{
                marginRight: '0.75rem',
                fontSize: '1.1rem',
                width: '20px',
                textAlign: 'center'
              }}></i>
              Dashboard
            </a>
          </li>
          <li style={{margin: '0.25rem 1rem'}}>
            <a href="/analytics" style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.875rem 1rem',
              color: isActive('analytics') ? 'white' : 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              background: isActive('analytics') ? 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)' : 'transparent',
              borderRadius: '8px',
              fontWeight: isActive('analytics') ? '600' : '500',
              fontSize: '0.95rem',
              boxShadow: isActive('analytics') ? '0 2px 8px rgba(247, 155, 114, 0.2)' : 'none',
              transition: 'all 0.3s ease'
            }} onMouseOver={(e) => {
              if (!isActive('analytics')) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateX(2px)';
              }
            }} onMouseOut={(e) => {
              if (!isActive('analytics')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.transform = 'translateX(0)';
              }
            }}>
              <i className="fas fa-chart-bar" style={{
                marginRight: '0.75rem',
                fontSize: '1.1rem',
                width: '20px',
                textAlign: 'center'
              }}></i>
              Analytics
            </a>
          </li>
          <li style={{margin: '0.25rem 1rem'}}>
            <a href="/connect" style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.875rem 1rem',
              color: isActive('connect') ? 'white' : 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              background: isActive('connect') ? 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)' : 'transparent',
              borderRadius: '8px',
              fontWeight: isActive('connect') ? '600' : '500',
              fontSize: '0.95rem',
              boxShadow: isActive('connect') ? '0 2px 8px rgba(247, 155, 114, 0.2)' : 'none',
              transition: 'all 0.3s ease'
            }} onMouseOver={(e) => {
              if (!isActive('connect')) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateX(2px)';
              }
            }} onMouseOut={(e) => {
              if (!isActive('connect')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.transform = 'translateX(0)';
              }
            }}>
              <i className="fas fa-link" style={{
                marginRight: '0.75rem',
                fontSize: '1.1rem',
                width: '20px',
                textAlign: 'center'
              }}></i>
              Connect Accounts
            </a>
          </li>
          <li style={{margin: '0.25rem 1rem'}}>
            <a href="/reports" style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.875rem 1rem',
              color: isActive('reports') ? 'white' : 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              background: isActive('reports') ? 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)' : 'transparent',
              borderRadius: '8px',
              fontWeight: isActive('reports') ? '600' : '500',
              fontSize: '0.95rem',
              boxShadow: isActive('reports') ? '0 2px 8px rgba(247, 155, 114, 0.2)' : 'none',
              transition: 'all 0.3s ease'
            }} onMouseOver={(e) => {
              if (!isActive('reports')) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateX(2px)';
              }
            }} onMouseOut={(e) => {
              if (!isActive('reports')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.transform = 'translateX(0)';
              }
            }}>
              <i className="fas fa-file-alt" style={{
                marginRight: '0.75rem',
                fontSize: '1.1rem',
                width: '20px',
                textAlign: 'center'
              }}></i>
              Reports
            </a>
          </li>
          <li style={{margin: '0.25rem 1rem'}}>
            <a href="/settings" style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.875rem 1rem',
              color: isActive('settings') ? 'white' : 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              background: isActive('settings') ? 'linear-gradient(135deg, #F79B72 0%, #e8845c 100%)' : 'transparent',
              borderRadius: '8px',
              fontWeight: isActive('settings') ? '600' : '500',
              fontSize: '0.95rem',
              boxShadow: isActive('settings') ? '0 2px 8px rgba(247, 155, 114, 0.2)' : 'none',
              transition: 'all 0.3s ease'
            }} onMouseOver={(e) => {
              if (!isActive('settings')) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateX(2px)';
              }
            }} onMouseOut={(e) => {
              if (!isActive('settings')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.transform = 'translateX(0)';
              }
            }}>
              <i className="fas fa-cog" style={{
                marginRight: '0.75rem',
                fontSize: '1.1rem',
                width: '20px',
                textAlign: 'center'
              }}></i>
              Settings
            </a>
          </li>
        </ul>
      </nav>

      {/* Logout Section */}
      <div style={{
        padding: '1.5rem 1rem 2rem 1rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        marginTop: 'auto'
      }}>
        <button onClick={handleLogout} style={{
          background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
          border: 'none',
          color: 'white',
          padding: '0.875rem 1rem',
          width: '100%',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.95rem',
          fontWeight: '600',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 8px rgba(220, 53, 69, 0.2)'
        }} onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
        }} onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.2)';
        }}>
          <i className="fas fa-sign-out-alt" style={{
            marginRight: '0.75rem',
            fontSize: '1.1rem'
          }}></i>
          Logout
        </button>
      </div>
    </aside>
  );
}
