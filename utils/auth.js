// utils/auth.js
export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('smap_user');
    window.location.href = '/login';
  }
};

export const getCurrentUser = () => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('smap_user');
    return user ? JSON.parse(user) : null;
  }
  return null;
};

export const isAuthenticated = () => {
  return getCurrentUser() !== null;
};
