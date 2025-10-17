// Configuration for API endpoints
const CONFIG = {
  // Detect environment and set appropriate API URL
  API_URL: (() => {
    // Development - localhost, IPv4, IPv6
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' || 
        window.location.hostname === '::1' ||
        window.location.hostname === '[::]' ||
        window.location.hostname === '0.0.0.0') {
      return 'http://localhost:3000/api';
    }
    
    // Production - Render backend URL (update this with your actual Render URL)
    return 'https://YOUR-ACTUAL-RENDER-URL.onrender.com/api';
  })()
};

// Make CONFIG available globally
window.CONFIG = CONFIG;
