import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, type AdminAuction, type AdminStats } from "../api";
import { formatDateTime, inr } from "../format";
import { Button, Icon, StatusChip } from "../ui";
import AdminShell from "./AdminShell";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rows, setRows] = useState<AdminAuction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>((location.state as { notice?: string } | null)?.notice ?? null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const mine = ++reqId.current;
    try {
      const [s, a] = await Promise.all([api.adminStats(), api.adminAuctions()]);
      if (mine !== reqId.current) return;
      setStats(s);
      setRows(a.auctions);
      setError(null);
    } catch (e) {
      if (mine === reqId.current) setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => { clearInterval(t); reqId.current += 1; };
  }, [load]);

  async function cancel(r: AdminAuction) {
    const name = `${r.bike.make} ${r.bike.model}`;
    if (!window.confirm(`Cancel the auction for ${name}? Bidders will no longer be able to bid.`)) return;
    setBusyId(r.id);
    setNotice(null);
    try {
      await api.cancelAuction(r.id);
      setNotice(`Cancelled the auction for ${name}.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const cards: [string, string, string, string][] = stats
    ? [
        ["Live auctions", String(stats.liveAuctions), `${stats.scheduledAuctions} upcoming`, "gavel"],
        ["Bids today", String(stats.bidsToday), `${stats.totalBids} all time`, "grid"],
        ["Registered users", String(stats.users), "accounts created", "users"],
        ["Sales value", inr(stats.salesValue), `${stats.soldCount} bikes sold`, "shield"],
      ]
    : [];

  return (
    <AdminShell active="dashboard">
      <header className="admin-header">
        <div><span>Admin console</span><div className="page-title">Dashboard</div></div>
        <Button onClick={() => navigate("/admin/auctions/new")}><Icon name="plus" /> Create auction</Button>
      </header>

      {notice && <div role="status" style={{ color: "var(--success)", marginBottom: 16 }}>{notice}</div>}
      {error && (
        <div role="alert" style={{ color: "#fb7777", marginBottom: 16 }}>
          {error} <Button variant="secondary" onClick={load}>Try again</Button>
        </div>
      )}

      <section className="stats-grid">
        {cards.map(([label, value, delta, icon]) => (
          <div className="stat-card" key={label}>
            <div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon name={icon} /></div></div>
            <strong>{value}</strong><small>{delta}</small>
          </div>
        ))}
      </section>

      <section className="table-card">
        <div className="table-header">
          <div><div className="section-title">Auctions</div><span>Manage and monitor all motorcycle auctions.</span></div>
        </div>
        <div className="auction-table">
          <div className="table-row table-head">
            <span>Bike</span><span>Status</span><span>Current price</span><span>Bids</span><span>Ends at</span><span>Actions</span>
          </div>
          {!rows && !error && <div style={{ padding: 24, color: "var(--muted)" }}>Loading…</div>}
          {rows && rows.length === 0 && <div style={{ padding: 24, color: "var(--muted)" }}>No auctions yet. Create the first one.</div>}
          {rows?.map((r) => (
            <div className="table-row" key={r.id}>
              <div className="table-bike">
                {r.bike.imageUrl && <img src={r.bike.imageUrl} alt="" />}
                <strong>{r.bike.make} {r.bike.model}</strong>
              </div>
              <div><StatusChip status={r.status} /></div>
              <strong>{inr(r.highestBidderId ? r.currentPrice : r.startingPrice)}</strong>
              <span>{r.bidCount}</span>
              <span>{formatDateTime(r.endsAt)}</span>
              <div className="row-actions">
                <Button variant="ghost" onClick={() => navigate(`/auctions/${r.id}`)}><Icon name="arrow" size={16} /> View</Button>
                {(r.status === "live" || r.status === "scheduled") && (
                  <Button variant="danger" disabled={busyId === r.id} onClick={() => cancel(r)}>
                    <Icon name="x" size={16} /> Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}