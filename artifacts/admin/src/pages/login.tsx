import { useState } from "react";
import { api, setToken } from "@/lib/api";
import { TRACKS } from "@/lib/utils";

interface LoginProps {
  onLogin: () => void;
}

type Mode = "signin" | "register";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm";

export default function LoginPage({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<Mode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [regDisplayName, setRegDisplayName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regTrack, setRegTrack] = useState("frontend");
  const [regBio, setRegBio] = useState("");
  const [regSchool, setRegSchool] = useState("");
  const [regQualification, setRegQualification] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      const me = await api.me();
      if (!me.tutorVerified) {
        setError("This account does not have tutor access.");
        setLoading(false);
        return;
      }
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const bioWithQual = regQualification
        ? `${regBio}\n\nQualification: ${regQualification}`
        : regBio;
      const { token } = await api.registerTutor({
        email: regEmail,
        password: regPassword,
        username: regUsername,
        displayName: regDisplayName,
        track: regTrack,
        school: regSchool,
        bio: bioWithQual,
      });
      setToken(token);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <img src={`${import.meta.env.BASE_URL}zero-club-logo.png`} alt="Zero Club" className="w-14 h-14 rounded-2xl object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Zero Club Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Tutor & Bootcamp Management</p>
        </div>

        <div className="flex bg-muted rounded-xl p-1 mb-6">
          <button
            onClick={() => switchMode("signin")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "signin"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode("register")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "register"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Register as Tutor
          </button>
        </div>

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={inputClass}
              />
            </div>

            {error && (
              <div className="px-3.5 py-2.5 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 mt-1"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name *</label>
                <input
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  placeholder="Ada Obi"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Username *</label>
                <input
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  placeholder="ada_obi"
                  required
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email *</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Password *</label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Area of Expertise *</label>
              <select
                value={regTrack}
                onChange={(e) => setRegTrack(e.target.value)}
                required
                className={inputClass}
              >
                {TRACKS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Institution / Organisation</label>
              <input
                value={regSchool}
                onChange={(e) => setRegSchool(e.target.value)}
                placeholder="e.g. University of Lagos"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Qualifications / Certifications *</label>
              <input
                value={regQualification}
                onChange={(e) => setRegQualification(e.target.value)}
                placeholder="e.g. AWS Certified, BSc Computer Science"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Why do you want to teach on Zero Club? *</label>
              <textarea
                value={regBio}
                onChange={(e) => setRegBio(e.target.value)}
                placeholder="Tell us about your teaching experience and what you hope to offer students..."
                required
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            {error && (
              <div className="px-3.5 py-2.5 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 mt-1"
            >
              {loading ? "Creating account..." : "Create Tutor Account"}
            </button>

            <p className="text-xs text-muted-foreground text-center pt-1">
              You'll get immediate access. Admins will reach out when you publish your first bootcamp.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
