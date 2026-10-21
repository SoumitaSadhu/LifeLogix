import { BASE_URL } from "./config";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const requestOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  let response = await fetch(url, requestOptions);

  if (response.status === 401 && (
    endpoint === "/auth/me" ||
    endpoint === "/auth/profile" ||
    !endpoint.startsWith("/auth/")
  )) {
    try {
      const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        response = await fetch(url, requestOptions);
      }
    } catch {
      // Preserve the original unauthorized response if refresh is unavailable.
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export default apiClient;