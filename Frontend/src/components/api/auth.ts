import apiClient from "./apiClient";

export interface AuthUser {
  userId: string | null;
  mobile: string;
  isNewUser: boolean;
  name?: string;
  email?: string;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  conditions?: string[];
  targetWeight?: number | null;
  targetBP?: string;
  exerciseGoal?: string;
  goalNotes?: string;
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
  return apiClient<AuthUser>("/auth/profile");
}

export function saveUserProfile(profile: Omit<AuthUser, "userId" | "mobile" | "isNewUser">) {
  return apiClient<AuthUser>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

export function logoutSession() {
  return apiClient<{ message: string }>("/auth/logout", { method: "POST" });
}