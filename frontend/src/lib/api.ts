// Fetch wrapper that injects JWT from localStorage and handles errors
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    // Network error (CORS, DNS, connection refused, etc.)
    const msg = err instanceof TypeError
      ? 'Cannot connect to server. Check your network or try again later.'
      : `Request failed: ${err}`;
    throw new Error(msg);
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned ${res.status} with unexpected response.`);
  }

  if (!data.success) {
    const msg = data.message || `Request failed (${res.status})`;
    if (data.error_code === 3201 || data.error_code === 3202) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    throw new Error(msg);
  }
  return data.data;
}

export const api = {
  get<T>(path: string) {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  },
  del<T>(path: string) {
    return request<T>(path, { method: 'DELETE' });
  },
};
