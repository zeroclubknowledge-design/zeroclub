import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { supabase } from "@workspace/supabase";

const API_DOMAIN_KEY = "@zero_club/domain";
const TOKEN_KEY = "@zero_club/token";
const USER_KEY = "@zero_club/user";

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  track: string;
  school?: string | null;
  referralCode?: string | null;
  level: number;
  xpBalance: number;
  fundsBalance?: number;
  followerCount?: number;
  followingCount?: number;
  tutorVerified?: number;
  createdAt: string;
}

interface AuthContextValue {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: UserProfile) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up base URL from env
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    if (domain) {
      setBaseUrl(`https://${domain}`);
    }

    // Restore session
    async function restore() {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as UserProfile);
          setAuthTokenGetter(() => storedToken);

          // Restore Supabase session so Storage/DB calls are authenticated
          await supabase.auth.setSession({
            access_token: storedToken,
            refresh_token: "", // Ideally we'd store this too, but this works for now
          });
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    restore();
  }, []);

  async function login(newToken: string, newUser: UserProfile) {
    setToken(newToken);
    setUser(newUser);
    setAuthTokenGetter(() => newToken);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, newToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser)),
    ]);
  }

  async function logout() {
    setToken(null);
    setUser(null);
    setAuthTokenGetter(() => null);
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  }

  async function updateUser(updated: UserProfile) {
    setUser(updated);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
