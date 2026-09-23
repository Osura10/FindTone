const BASE_URL = 'http://localhost:5036/api';

export const apiCall = async (endpoint, options = {}) => {
  // Check sessionStorage first (per-tab isolation) then fallback to localStorage
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  
  const headers = {
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  // Let the browser set the multipart boundary for FormData uploads
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkError) {
    const err = new Error('Unable to connect to the backend server. Please ensure the backend is running on http://localhost:5036.');
    err.status = 0;
    throw err;
  }

  if (!response.ok) {
    let errorMessage = 'API error';
    try {
      const text = await response.text();
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.message || errorData.title || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
      } catch {
        errorMessage = text || response.statusText;
      }
    } catch (e) {
      errorMessage = response.statusText;
    }
    const err = new Error(errorMessage);
    err.status = response.status;
    throw err;
  }

  // Handle empty responses (like 204 No Content or a 200 OK with no body)
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};
