import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { ApiError } from "../api";
import { Button, Field, Icon, Logo, cx } from "../ui";

const HERO = "https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=1200&q=85";

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/auctions";

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const fieldErr = (f: string): string | undefined =>
    error?.status === 422 && Array.isArray(error.details)
      ? error.details.find((d: any) => d.field === f)?.message
      : undefined;
  const generalErr = error && error.status !== 422 ? error.message : undefined;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") await login(email, password);
      else await register(name, email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "UNKNOWN", "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  function switchMode(m: "signin" | "register") {
    setMode(m);
    setError(null);
  }

  return (
    <main className="login-screen">
      <section className="login-visual">
        <img src={HERO} alt="KTM motorcycle on an open road" />
        <div className="login-overlay" />
        <div className="visual-brand">
          <Logo />
          <div className="display-copy">Find your next ride.<br /><span>Bid with confidence.</span></div>
          <p>Verified motorcycles. Transparent auctions. No surprises.</p>
        </div>
        <div className="trust-row"><span><Icon name="shield" size={17} /> Verified listings</span><span>Live, fair bidding</span></div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={onSubmit} noValidate>
          <div className="mobile-logo"><Logo /></div>
          <div className="auth-kicker">Welcome to RevBid</div>
          <div className="auth-title">{mode === "signin" ? "Sign in to your account" : "Create your account"}</div>
          <p>{mode === "signin" ? "Continue bidding on motorcycles you love." : "Join and start bidding in minutes."}</p>

          <div className="tabs auth-tabs">
            <button type="button" className={cx(mode === "signin" && "active")} onClick={() => switchMode("signin")}>Sign in</button>
            <button type="button" className={cx(mode === "register" && "active")} onClick={() => switchMode("register")}>Register</button>
          </div>

          <div className="auth-fields">
            {mode === "register" && (
              <Field label="Full name" placeholder="Enter your full name" value={name} onChange={setName} autoComplete="name" error={fieldErr("name")} />
            )}
            <Field label="Email address" type="email" placeholder="you@example.com" value={email} onChange={setEmail} autoComplete="email" error={fieldErr("email")} />
            <Field
              label="Password"
              type="password"
              placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
              value={password}
              onChange={setPassword}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              error={fieldErr("password") ?? generalErr}
            />
          </div>

          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            {!busy && <Icon name="arrow" size={18} />}
          </Button>
          <div className="terms">Demo account: demo@revbid.com / Demo@12345</div>
        </form>
      </section>
    </main>
  );
}