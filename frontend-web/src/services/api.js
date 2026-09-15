const BASE_URL = 'http://localhost:5036/api';

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'API error';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.title || JSON.stringify(errorData);
    } catch (e) {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (like 204 No Content or a 200 OK with no body)
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};
