import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { clearToken, getToken, setToken } from './token';

import type { LoginResponse } from '@/types/auth';

type RetryableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type ValidationDetail = Array<{ loc: Array<string | number>; msg: string; type: string }>;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly detail?: string | ValidationDetail,
    public readonly isNetworkError = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;

const toApiError = (error: AxiosError<unknown>) => {
  const responseData = error.response?.data as { detail?: string | ValidationDetail } | undefined;
  const detail = responseData?.detail;
  const message =
    typeof detail === 'string'
      ? detail
      : Array.isArray(detail) && detail[0]?.msg
        ? detail[0].msg
        : error.response
          ? `요청을 처리하지 못했어요. (${error.response.status})`
          : '네트워크 연결을 확인해 주세요.';

  if (process.env.NODE_ENV === 'development' && Array.isArray(detail)) {
    console.error('API validation error', detail);
  }
  return new ApiError(message, error.response?.status, detail, !error.response);
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true,
});

export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

const redirectToLogin = () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname.startsWith('/admin/login')) {
    return;
  }

  clearToken();
  window.location.replace('/admin/login');
};

/** 동시에 401이 여러 번 나와도 refresh 요청은 한 번만 보냅니다. */
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<LoginResponse>(`${API_BASE_URL}/auth/refresh`, null, {
        withCredentials: true,
      })
      .then(({ data }) => {
        setToken(data.access_token);
        return data.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

const isAuthRoute = (url?: string) =>
  Boolean(url?.includes('/auth/login') || url?.includes('/auth/refresh'));

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;

    if (!config || error.response?.status !== 401) {
      return Promise.reject(toApiError(error));
    }

    if (config.url?.includes('/auth/login')) {
      return Promise.reject(toApiError(error));
    }

    if (isAuthRoute(config.url) || config._retry) {
      redirectToLogin();
      return Promise.reject(toApiError(error));
    }

    config._retry = true;

    try {
      const accessToken = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${accessToken}`;
      return api(config);
    } catch {
      redirectToLogin();
      return Promise.reject(toApiError(error));
    }
  },
);

publicApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string | ValidationDetail }>) => Promise.reject(toApiError(error)),
);
