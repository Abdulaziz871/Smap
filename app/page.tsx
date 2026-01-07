export default function Home() {
  return (
    <div>
      {/* Navigation */}
      <nav className="nav">
        <span className="nav-brand">SMAP</span>
        <div>
          <a href="/login">Login</a>
          <a href="/register">Register</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <h1>Social Media Analytics, Simplified</h1>
        <p>Transform your social media data into actionable insights<br />with SMAP's powerful analytics platform</p>
        <a className="btn-primary" href="/register">Get Started</a>
      </section>

      {/* Features Section */}
      <div className="features">
       
        <div className="section-card">
          <h2>Easy Reporting</h2>
          <p>Generate beautiful, actionable reports with one click and share insights with your team effortlessly.</p>
        </div>
        <div className="section-card">
          <h2>Multi-Platform</h2>
          <p>Connect all your social media accounts and get unified analytics across all major platforms in one dashboard.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} SMAP - Social Media Analytics Platform</p>
      </footer>
    </div>
  );
}
