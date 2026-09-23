const BASE_URL = 'http://localhost:5036/api';

export const apiCall = async (endpoint, options = {}) => {
  // Check sessionStorage first (per-tab isolation) then fallback to localStorage
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  
  const headers = {
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'API error';
    try {
      const text = await response.text();
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.message || errorData.title || JSON.stringify(errorData);
      } catch {
        errorMessage = text || response.statusText;
      }
    } catch (e) {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (like 204 No Content or a 200 OK with no body)
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};
