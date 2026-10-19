import apiClient from "./apiClient";

export interface AuthUser {
  userId: string | null;
  mobile: string;
  isNewUser: boolean;
}

export function sendOtp(mobile: string) {
  return apiClient<{ message: string }>("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ mobile }),
  });
}

export function verifyOtp(mobile: string, otp: string) {
  return apiClient<{ message: string } & AuthUser>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ mobile, otp }),
  });
}

export function getCurrentUser() {
  return apiClient<AuthUser>("/auth/me");
}

export function logoutSession() {
  return apiClient<{ message: string }>("/auth/logout", { method: "POST" });
}