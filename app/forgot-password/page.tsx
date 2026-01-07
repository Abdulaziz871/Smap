export default function ForgotPassword() {
  return (
    <div className="center-container">
      <form className="form-container">
        <h2 className="text-center mb-1" style={{ color: '#2A4759' }}>
          Reset Password
        </h2>
        
        <p className="text-center mb-2" style={{ 
          color: '#2A4759',
          fontSize: '0.9rem'
        }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        <input 
          className="input-field"
          type="email" 
          placeholder="Email" 
          required 
        />
        
        <button 
          className="btn-primary w-full mb-1" 
          type="submit"
        >
          Send Reset Link
        </button>
        
        <div className="text-center">
          <a href="/login" style={{ color: '#2A4759', marginRight: '1rem' }}>
            ← Back to Login
          </a>
          <a href="/register" style={{ color: '#F79B72' }}>
            Create Account
          </a>
        </div>
      </form>
    </div>
  );
}
