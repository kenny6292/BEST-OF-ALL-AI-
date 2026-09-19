import { FormEvent, useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../lib/supabase";

type Props = {
  onClose: () => void;
};

export function AuthPanel({ onClose }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabaseConfigured) setMessage("Supabase is not configured yet.");
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");

    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(mode === "signup"
        ? "Account created. Check your email if verification is enabled."
        : "Signed in successfully.");
      if (mode === "signin") window.setTimeout(onClose, 500);
    }

    setBusy(false);
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Account authentication">
      <div className="auth-card">
        <div className="auth-header">
          <div>
            <strong>{mode === "signin" ? "Sign in" : "Create your account"}</strong>
            <span>Secure account access for BEST OF ALL AI</span>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button className="auth-submit" disabled={!supabaseConfigured || busy}>
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        {message && <p className="auth-message">{message}</p>}
        <button className="auth-switch" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
          {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
