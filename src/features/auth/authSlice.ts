"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "./types";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const rawUser = localStorage.getItem("factory1_user");

  if (!rawUser || rawUser === "undefined" || rawUser === "null") {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    localStorage.removeItem("factory1_user");
    return null;
  }
}

const initialState: AuthState = {
  token:
    typeof window !== "undefined"
      ? localStorage.getItem("factory1_token")
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

      localStorage.setItem("factory1_token", action.payload.token);

      if (action.payload.user) {
        localStorage.setItem(
          "factory1_user",
          JSON.stringify(action.payload.user)
        );
      } else {
        localStorage.removeItem("factory1_user");
      }
    },

    logout: (state) => {
      state.token = null;
      state.user = null;

      localStorage.removeItem("factory1_token");
      localStorage.removeItem("factory1_user");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;