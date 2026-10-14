import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Button, Icon, Logo, cx } from "../ui";

const ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "grid", to: "/admin" },
  { key: "new", label: "New auction", icon: "plus", to: "/admin/auctions/new" },
  { key: "site", label: "View site", icon: "gavel", to: "/auctions" },
];

export default function AdminShell({
  active, mainClass = "", children,
}: { active: "dashboard" | "new"; mainClass?: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name ?? "")
    .split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="side-logo"><Logo /></div>
        <div className="side-label">Workspace</div>
        <div className="side-nav">
          {ITEMS.map((i) => (
            <button key={i.key} className={cx(active === i.key && "active")} onClick={() => navigate(i.to)}>
              <Icon name={i.icon} /><span>{i.label}</span>
            </button>
          ))}
        </div>
        <div className="admin-profile">
          <div className="avatar">{initials}</div>
          <div><strong>{user?.name}</strong><span>Administrator</span></div>
        </div>
        <div style={{ padding: "0 16px 16px" }}>
          <Button variant="ghost" onClick={() => { logout(); navigate("/login"); }}>Sign out</Button>
        </div>
      </aside>
      <main className={cx("admin-main", mainClass)}>{children}</main>
    </div>
  );
}