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
    // Add timeout signal to detect hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    const fetchOpts = { ...options, headers, signal: controller.signal } as RequestInit;
    res = await fetch(`${API_BASE}${path}`, fetchOpts);
    clearTimeout(timeoutId);
  } catch (err: any) {
    let msg: string;
    if (err?.name === 'AbortError') {
      msg = 'Server did not respond within 30 seconds. Please try again.';
    } else if (err instanceof TypeError) {
      msg = `Cannot reach server (${API_BASE || 'same origin'}). Port might be blocked or server down.`;
    } else {
      msg = err?.message || 'An unknown network error occurred.';
    }
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
