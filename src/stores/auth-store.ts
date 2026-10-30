import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as api from "@/lib/api";
import type { LoginCredentials, LoginResult, Profile, SignupDetails } from "@/lib/api";
import { useThemeStore } from "./theme-store";

type AuthState = {
  token: string | null;
  profile: Profile | null;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  signup: (details: SignupDetails) => Promise<void>;
  loginWithToken: (token: string) => void;
  logout: () => void;
  fetchProfile: () => Promise<Profile | null>;
};

function markAuthenticated(authenticated: boolean) {
  const root = document.documentElement;
  if (authenticated) root.dataset.auth = "true";
  else delete root.dataset.auth;
}

export const authScript = `try{if(JSON.parse(localStorage.getItem("auth")).state.token)document.documentElement.dataset.auth="true"}catch(e){}`;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      profile: null,
      login: async (credentials) => {
        const result = await api.login(credentials);
        if ("token" in result) {
          set({ token: result.token });
          markAuthenticated(true);
        }
        return result;
      },
      signup: async (details) => {
        set({ token: await api.signup(details) });
        markAuthenticated(true);
      },
      loginWithToken: (token) => {
        set({ token });
        markAuthenticated(true);
      },
      logout: () => {
        markAuthenticated(false);
        set({ token: null, profile: null });
      },
      fetchProfile: async () => {
        const { token, logout } = get();
        const profile = token ? await api.getProfile(token) : null;

        if (profile) {
          set({ profile });
          useThemeStore.getState().setMode(profile.theme);
        } else {
          logout();
        }

        return profile;
      },
    }),
    { name: "auth", partialize: ({ token }) => ({ token }) },
  ),
);
