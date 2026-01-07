// Quick MongoDB Data Viewer
// Open browser console and run these commands

// View all users
fetch('/api/admin/view?collection=users')
  .then(res => res.json())
  .then(data => console.table(data.data));

// View social media accounts
fetch('/api/admin/view?collection=socialMediaAccounts')
  .then(res => res.json())
  .then(data => console.table(data.data));

// View analytics data
fetch('/api/admin/view?collection=followerAnalytics')
  .then(res => res.json())
  .then(data => console.table(data.data));

// Initialize database with sample data
fetch('/api/init-db', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log('Database initialized:', data));
