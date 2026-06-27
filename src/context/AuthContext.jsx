import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  login as loginService,
  logoutUser,
  registerUser,
  subscribeToFirebaseAuth,
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToFirebaseAuth((nextProfile) => {
      if (!active) return;

      setProfile(nextProfile || null);
      setLoading(false);
    });

    return () => {
      active = false;

      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      profile,
      user: profile,
      loading,
      isAuthenticated: Boolean(profile),

      async login(identifier, password, remember = false) {
        const nextProfile = await loginService(identifier, password, remember);
        setProfile(nextProfile);
        return nextProfile;
      },

      async register(payload) {
        const createdUser = await registerUser(payload);

        /*
          Important:
          Do not replace the current logged-in admin/superadmin profile
          when they create a new employee/admin account.
        */
        return createdUser;
      },

      async logout() {
        await logoutUser();
        setProfile(null);
      },

      setProfile,
    }),
    [loading, profile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

export default AuthContext;