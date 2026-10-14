import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    arrow: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    gavel: <><path d="m14 5 5 5M11 8l5 5M5 19l8-8M3 21h8" /><path d="m12 3 9 9-3 3-9-9z" /></>,
    bike: <><circle cx="6" cy="16" r="3" /><circle cx="18" cy="16" r="3" /><path d="m6 16 4-7h4l4 7M9 11h6M14 9l2-3h2" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" /></>,
    x: <path d="m6 6 12 12M18 6 6 18" />,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></>,
    back: <path d="m15 18-6-6 6-6" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="logo-mark"><span>R</span></div>
      {!compact && <div className="text-xl font-bold tracking-tight">Rev<span className="text-accent">Bid</span></div>}
    </div>
  );
}

export function Button({
  children, variant = "primary", className, onClick, type = "button", disabled,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={disabled ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
      className={cx("btn", `btn-${variant}`, className)}
    >
      {children}
    </button>
  );
}

export function Field({
  label, placeholder, type = "text", error, prefix, value, onChange, name, autoComplete, disabled, inputMode,
}: {
  label: string; placeholder?: string; type?: string; error?: string; prefix?: string;
  value?: string; onChange?: (v: string) => void; name?: string; autoComplete?: string;
  disabled?: boolean; inputMode?: "numeric" | "text" | "email";
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className={cx("input-shell", error && "input-error")}>
        {prefix && <span className="text-muted">{prefix}</span>}
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          inputMode={inputMode}
          aria-invalid={error ? true : undefined}
        />
      </div>
      {error && <span className="error-text" role="alert">{error}</span>}
    </label>
  );
}

export function SelectField({
  label, children, error, value, onChange,
}: {
  label?: string; children: ReactNode; error?: string; value?: string; onChange?: (v: string) => void;
}) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      <div className={cx("select-shell", error && "input-error")}>
        <select value={value} onChange={(e) => onChange?.(e.target.value)}>{children}</select>
        <Icon name="chevron" size={16} />
      </div>
      {error && <span className="error-text">{error}</span>}
    </label>
  );
}

const STATUS_LABEL = { live: "Live", scheduled: "Scheduled", ended: "Ended", cancelled: "Cancelled" } as const;
const STATUS_CLASS = { live: "live", scheduled: "scheduled", ended: "ended", cancelled: "ended" } as const;

export function StatusChip({ status }: { status: keyof typeof STATUS_LABEL }) {
  return <span className={cx("status-chip", `status-${STATUS_CLASS[status]}`)}><i />{STATUS_LABEL[status]}</span>;
}

export function Countdown({ value, urgent = false, large = false }: { value: string; urgent?: boolean; large?: boolean }) {
  return (
    <div className={cx("countdown", urgent && "text-danger", large && "countdown-large")}>
      <Icon name="clock" size={large ? 20 : 16} /><span>{value}</span>
    </div>
  );
}

export function TopNav({ active = "Auctions" }: { active?: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user
    ? user.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "";
  return (
    <nav className="topnav">
      <Link to="/auctions" className="logo-button"><Logo /></Link>
      <div className="nav-links">
        <button className={active === "Auctions" ? "active" : ""} onClick={() => navigate("/auctions")}>Auctions</button>
        {user?.role === "admin" && (
          <button className={active === "Admin" ? "active" : ""} onClick={() => navigate("/admin")}>Admin</button>
        )}
      </div>
      {user ? (
        <div className="nav-user">
          <div><strong>{user.name}</strong><span>{user.role === "admin" ? "Administrator" : "Bidder"}</span></div>
          <div className="avatar">{initials}</div>
          <Button variant="ghost" onClick={() => { logout(); navigate("/login"); }}>Sign out</Button>
        </div>
      ) : (
        <div className="nav-user"><Button onClick={() => navigate("/login")}>Sign in</Button></div>
      )}
    </nav>
  );
}