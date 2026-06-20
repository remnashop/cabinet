import axios, { type AxiosInstance } from "axios";

export const api: AxiosInstance = axios.create({
  baseURL: "/api/v1/public",
  withCredentials: true,
});

export function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

let onUnauthorized: () => void = () => {};

export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

export function handleResponseError(error: unknown): Promise<never> {
  if (isUnauthorized(error)) {
    onUnauthorized();
  }
  return Promise.reject(error);
}

api.interceptors.response.use((response) => response, handleResponseError);
