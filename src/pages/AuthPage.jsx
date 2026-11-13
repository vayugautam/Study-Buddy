import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Alert } from "../components/UI";
import Icon from "../components/Icon";

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setEmail("");
    setPassword("");
  }, [mode]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isRegister) await register(email.trim(), password);
      else await login(email.trim(), password);
      navigate(location.state?.from?.pathname || "/app", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-side-panel">
        <Link to="/" className="brand-lockup"><span className="brand-mark"><Icon name="book" size={22} /></span><span><strong>study buddy</strong><small>AI learning workspace</small></span></Link>
        <div className="auth-promo"><span className="hero-kicker"><span className="kicker-dot" /> Your next study session</span><h1>Less searching.<br /><em>More understanding.</em></h1><p>Ask better questions of the material you already have.</p><div className="auth-promo-card"><span className="feature-icon feature-icon-sage"><Icon name="spark" size={20} /></span><span><b>Answers with receipts</b><small>Every response can point you back to the right page.</small></span></div></div>
        <span className="auth-side-foot">A private space for your learning.</span>
      </div>
      <main className="auth-form-panel">
        <Link className="auth-back-link" to="/"><span>←</span> Back to home</Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">{isRegister ? "A FRESH START" : "WELCOME BACK"}</span>
          <h2>{isRegister ? "Create your account" : "Sign in to your space"}</h2>
          <p className="auth-subtitle">{isRegister ? "Your study library is just a few steps away." : "Pick up where your last study session left off."}</p>
          <Alert>{error}</Alert>
          <form className="auth-form" onSubmit={submit}>
            <label className="field-label" htmlFor="email">Email address</label>
            <input id="email" className="text-input" type="email" autoComplete="email" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            <div className="field-label-row"><label className="field-label" htmlFor="password">Password</label>{isRegister && <span className="field-hint">At least 8 characters</span>}</div>
            <input id="password" className="text-input" type="password" autoComplete={isRegister ? "new-password" : "current-password"} required minLength={isRegister ? 8 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? "Create a password" : "Your password"} />
            <button className="button button-dark button-full auth-submit" type="submit" disabled={busy}>{busy ? <><span className="spinner spinner-light" />{isRegister ? "Creating your account…" : "Signing in…"}</> : <>{isRegister ? "Create account" : "Sign in"}<Icon name="arrow" size={17} /></>}</button>
          </form>
          <div className="auth-switch">{isRegister ? "Already have an account?" : "New to Study Buddy?"} <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></div>
          <p className="auth-security"><Icon name="check" size={14} /> Your documents and conversations are private to your account.</p>
        </div>
      </main>
    </div>
  );
}
