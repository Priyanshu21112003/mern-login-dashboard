
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || 'Request failed. Please try again.'
    );
    error.needsVerification = Boolean(data.needsVerification);
    error.email = data.email;
    throw error;
  }

  return data;
}
