const BASE_URL = 'http://localhost:5036/api';

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const isFormData = options.body instanceof FormData;
  
  const headers = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };


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
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.title || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
    } catch (e) {
      try {
        const text = await response.text();
        errorMessage = text || response.statusText;
      } catch {
        errorMessage = response.statusText;
      }
    }
    const err = new Error(errorMessage);
    err.status = response.status;
    throw err;
  }

  // Handle empty responses (like 204 No Content or a 200 OK with no body)
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};
