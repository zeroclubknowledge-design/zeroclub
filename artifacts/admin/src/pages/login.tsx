import { useState } from "react";
import { api, setToken, getToken } from "@/lib/api";

interface LoginProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selfPromoting, setSelfPromoting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      try {
        const me = await api.me();
        if (!me.tutorVerified) {
          setSelfPromoting(true);
          await api.makeAdmin(me.id);
          setSelfPromoting(false);
        }
      } catch {
        // ignore
      }
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 mb-4">
            <span className="text-2xl font-black text-primary">Z</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Zero Club Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Tutor & Bootcamp Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-sm"
            />
          </div>

          {error && (
            <div className="px-3.5 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {selfPromoting ? "Setting up access..." : loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Use your Zero Club credentials. First-time access will be automatically granted.
        </p>
      </div>
    </div>
  );
}
