"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "./types";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

export const AUTH_TOKEN_STORAGE_KEY = "factory1_token";
export const AUTH_USER_STORAGE_KEY = "factory1_user";
export const AUTH_LAST_ACTIVITY_STORAGE_KEY = "factory1_last_activity_at";

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const rawUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!rawUser || rawUser === "undefined" || rawUser === "null") {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return null;
  }
}

const initialState: AuthState = {
  token:
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
      : null,
  user: getStoredUser(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; user?: AuthUser | null }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user ?? null;

      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, action.payload.token);
      localStorage.setItem(AUTH_LAST_ACTIVITY_STORAGE_KEY, String(Date.now()));

      if (action.payload.user) {
        localStorage.setItem(
          AUTH_USER_STORAGE_KEY,
          JSON.stringify(action.payload.user)
        );
      } else {
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      }
    },

    logout: (state) => {
      state.token = null;
      state.user = null;

      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      localStorage.removeItem(AUTH_LAST_ACTIVITY_STORAGE_KEY);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
