import apiClient from "./apiClient";

export function sendOtp(mobile: string) {
  return apiClient<{ message: string }>("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ mobile }),
  });
}

export function verifyOtp(mobile: string, otp: string) {
  return apiClient<{ message: string; userId: string; isNewUser: boolean }>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ mobile, otp }),
  });
}