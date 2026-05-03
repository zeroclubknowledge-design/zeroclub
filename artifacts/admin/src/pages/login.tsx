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

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Tutor registration state
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
  const [registered, setRegistered] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      const me = await api.me();
      if (!me.tutorVerified) {
        setError("Your account is pending tutor verification. An admin will review your application shortly.");
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
      await api.registerTutor({
        email: regEmail,
        password: regPassword,
        username: regUsername,
        displayName: regDisplayName,
        track: regTrack,
        school: regSchool,
        bio: bioWithQual,
      });
      setRegistered(true);
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

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/15 mb-2">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground">Application Submitted!</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your tutor application has been received. An admin will review your qualifications
            and grant you access to the Zero Club Admin panel once verified.
          </p>
          <button
            onClick={() => { setRegistered(false); setMode("signin"); }}
            className="text-sm text-primary hover:opacity-80"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-7 text-center">
          <div className="inline-flex items-center justify-center w-13 h-13 rounded-2xl bg-primary/15 mb-4">
            <span className="text-2xl font-black text-primary">Z</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Zero Club Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Tutor & Bootcamp Management</p>
        </div>

        {/* Tab switcher */}
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
              {loading ? "Submitting application..." : "Submit Tutor Application"}
            </button>

            <p className="text-xs text-muted-foreground text-center pt-1">
              Your application will be reviewed by a Zero Club admin before access is granted.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
