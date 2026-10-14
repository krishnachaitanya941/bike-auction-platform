import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError, type AuctionDetail } from "../api";
import { useAuth } from "../auth";
import { formatDateTime, formatDuration, inr, timeAgo } from "../format";
import { useRealtime, type BidEvent, type StatusEvent } from "../socket";
import { useServerClock } from "../useClock";
import { Button, Countdown, Field, Icon, StatusChip, TopNav, cx } from "../ui";

type BannerKind = "winning" | "outbid" | "won" | "ended" | "cancelled";
interface Banner { kind: BannerKind; title: string; text: string }

function BidBanner({ banner }: { banner: Banner | null }) {
  if (!banner) return null;
  const good = banner.kind === "winning" || banner.kind === "won";
  const cls = good ? "banner-winning" : banner.kind === "outbid" ? "banner-outbid" : "banner-ended";
  return (
    <div className={cx("bid-banner", cls)} role="status">
      <div className="banner-icon"><Icon name={good ? "shield" : "gavel"} /></div>
      <div><strong>{banner.title}</strong><span>{banner.text}</span></div>
    </div>
  );
}

export default function AuctionDetailPage() {
  const { id } = useParams();
  const auctionId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState<AuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(!Number.isInteger(auctionId) || auctionId <= 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const requestCounter = useRef(0);
  const touched = useRef(false);
  const pendingRid = useRef<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      const mine = ++requestCounter.current;
      try {
        const d = await api.getAuction(auctionId);
        if (mine !== requestCounter.current) return;
        // Ignore a slow, stale response that would undo a newer bid.
        setData((prev) =>
          prev && prev.auction.id === d.auction.id && d.auction.bidCount < prev.auction.bidCount ? prev : d
        );
        setLoadError(null);
      } catch (e) {
        if (mine !== requestCounter.current) return;
        const err = e as ApiError;
        if (err.status === 404 || err.status === 400) setMissing(true);
        else if (!silent) setLoadError(err.message);
      } finally {
        if (mine === requestCounter.current) setLoading(false);
      }
    },
    [auctionId]
  );

  const connected = useRealtime(
    missing ? null : { event: "auction:join", auctionId },
    {
      "bid:placed": (e: BidEvent) => {
        if (e.auctionId !== auctionId) return;
        setData((prev) => {
          if (!prev) return prev;
          const known = prev.bids.some((b) => b.id === e.bid.id);
          const bids = known
            ? prev.bids
            : [e.bid, ...prev.bids].sort((x, y) => y.amount - x.amount).slice(0, 20);
          return {
            serverTime: e.serverTime,
            bids,
            auction: {
              ...prev.auction,
              status: e.status,
              currentPrice: e.currentPrice,
              minNextBid: e.minNextBid,
              highestBidderId: e.highestBidderId,
              bidCount: e.bidCount,
              endsAt: e.endsAt,
            },
          };
        });
      },
      "auction:status": (e: StatusEvent) => {
        if (e.auctionId === auctionId) load(true);
      },
    },
    () => load(true)
  );

  useEffect(() => {
    if (missing) return;
    setLoading(true);
    load();
    return () => {
      requestCounter.current += 1;
    };
  }, [load, missing]);

  // Live updates arrive over the socket; polling is only a safety net.
  useEffect(() => {
    if (missing) return;
    const t = setInterval(() => load(true), connected ? 30000 : 3000);
    return () => clearInterval(t);
  }, [load, missing, connected]);

  const a = data?.auction;
  const bids = data?.bids ?? [];
  const now = useServerClock(data?.serverTime);

  // Keep the bid box at the minimum next bid until the user types their own amount.
  useEffect(() => {
    if (a && !touched.current) setAmount(String(a.minNextBid));
  }, [a?.minNextBid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (missing) {
    return (
      <div className="app-page">
        <TopNav active="Auctions" />
        <main className="detail-container">
          <button className="back-link" onClick={() => navigate("/auctions")}><Icon name="back" size={17} /> All auctions</button>
          <div style={{ padding: "48px 0", color: "var(--muted)" }}>This auction could not be found.</div>
        </main>
      </div>
    );
  }

  if (!a) {
    return (
      <div className="app-page">
        <TopNav active="Auctions" />
        <main className="detail-container">
          <button className="back-link" onClick={() => navigate("/auctions")}><Icon name="back" size={17} /> All auctions</button>
          {loadError ? (
            <div role="alert" style={{ padding: "48px 0", color: "#fb7777" }}>
              {loadError} <Button variant="secondary" onClick={() => load()}>Try again</Button>
            </div>
          ) : (
            <div style={{ padding: "48px 0", color: "var(--muted)" }}>{loading ? "Loading auction…" : ""}</div>
          )}
        </main>
      </div>
    );
  }

  const title = `${a.bike.make} ${a.bike.model}`;
  const startMs = new Date(a.startsAt).getTime();
  const endMs = new Date(a.endsAt).getTime();
  const over = a.status === "ended" || a.status === "cancelled" || now >= endMs;
  const canBid = !over && (a.status === "live" || (a.status === "scheduled" && now >= startMs));
  const notStarted = !over && !canBid;
  const myId = user?.id ?? null;
  const iAmHighest = myId !== null && a.highestBidderId === myId;
  const iHaveBid = myId !== null && bids.some((b) => b.userId === myId);
  const winnerName = bids[0]?.bidder ?? "—";

  let banner: Banner | null = null;
  if (a.status === "cancelled") {
    banner = { kind: "cancelled", title: "Auction cancelled", text: "This auction was cancelled by the seller." };
  } else if (over) {
    banner = !a.highestBidderId
      ? { kind: "ended", title: "Auction ended", text: "There were no bids on this motorcycle." }
      : iAmHighest
        ? { kind: "won", title: "You won this auction", text: `Winning bid: ${inr(a.currentPrice)}.` }
        : { kind: "ended", title: "Auction ended", text: `Winner: ${winnerName} at ${inr(a.currentPrice)}` };
  } else if (canBid && iAmHighest) {
    banner = { kind: "winning", title: "You are the highest bidder", text: "We'll show it here if someone places a higher bid." };
  } else if (canBid && iHaveBid) {
    banner = { kind: "outbid", title: "You've been outbid", text: "Place a new bid to get back in the lead." };
  }

  const msLeft = endMs - now;
  const urgent = canBid && msLeft < 5 * 60 * 1000;
  const priceLabel = over ? (a.highestBidderId ? "Final price" : "No bids") : a.highestBidderId ? "Current bid" : "Starting bid";
  const priceValue = over && !a.highestBidderId ? "—" : inr(a.highestBidderId ? a.currentPrice : a.startingPrice);

  function onAmountChange(v: string) {
    touched.current = true;
    pendingRid.current = null;
    setAmount(v.replace(/[^\d]/g, ""));
    setFormError(null);
  }

  function addQuick(n: number) {
    touched.current = true;
    pendingRid.current = null;
    setAmount(String((Number(amount) || a!.minNextBid) + n));
    setFormError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!a) return;
    setFormError(null);
    setNotice(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setFormError("Enter a valid amount.");
    if (value < a.minNextBid) return setFormError(`Your bid must be at least ${inr(a.minNextBid)}.`);

    setBusy(true);
    // Reuse the same request id only when retrying after a network failure.
    const rid = pendingRid.current ?? crypto.randomUUID();
    pendingRid.current = rid;
    try {
      const r = await api.placeBid(a.id, value, rid);
      pendingRid.current = null;
      touched.current = false;
      setNotice(r.extended ? `Bid placed: ${inr(value)}. Auction extended by 30 seconds.` : `Bid placed: ${inr(value)}.`);
      await load(true);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status !== 0) pendingRid.current = null;
      if (apiErr.status === 401) {
        navigate("/login", { state: { from: `/auctions/${a.id}` } });
        return;
      }
      setFormError(apiErr.message);
      await load(true);
    } finally {
      setBusy(false);
    }
  }

  const bidCard = (
    <div className="bid-card">
      <BidBanner banner={banner} />
      <div className="bid-card-top">
        <div>
          <span className="eyebrow">{priceLabel}</span>
          <div className="bid-price price-flash" key={priceValue}>{priceValue}</div>
        </div>
        <StatusChip status={over && a.status === "live" ? "ended" : a.status} />
      </div>

      {canBid && (
        <div className="timer-panel">
          <span>Auction ends in</span>
          <Countdown value={formatDuration(msLeft)} urgent={urgent} large />
          <small>{formatDateTime(a.endsAt)}</small>
        </div>
      )}
      {notStarted && (
        <div className="timer-panel">
          <span>Auction starts in</span>
          <Countdown value={formatDuration(startMs - now)} large />
          <small>{formatDateTime(a.startsAt)}</small>
        </div>
      )}

      <div className="bid-facts">
        <div>
          <span>{over ? "Winner" : "Highest bidder"}</span>
          <strong>{!a.highestBidderId ? "—" : iAmHighest ? "You" : winnerName}</strong>
        </div>
        <div><span>Total bids</span><strong>{a.bidCount}</strong></div>
      </div>

      {canBid && (
        <>
          <div className="min-bid"><span>Minimum next bid</span><strong>{inr(a.minNextBid)}</strong></div>
          {user ? (
            <form onSubmit={submit} noValidate>
              <Field label="Your bid amount" prefix="₹" value={amount} onChange={onAmountChange} inputMode="numeric" error={formError ?? undefined} />
              <div className="quick-bids">
                {[500, 1000, 2000].map((n) => (
                  <Button key={n} variant="secondary" onClick={() => addQuick(n)} disabled={busy}>+{n.toLocaleString("en-IN")}</Button>
                ))}
              </div>
              <Button className="w-full place-bid" type="submit" disabled={busy || iAmHighest}>
                {busy ? "Placing bid…" : iAmHighest ? "You are leading" : "Place bid"} {!busy && <Icon name="arrow" />}
              </Button>
              {notice && <p role="status" style={{ color: "var(--success)", fontSize: 12, marginTop: 10 }}>{notice}</p>}
              <p className="bid-disclaimer">By placing a bid, you agree to complete the purchase if you win.</p>
            </form>
          ) : (
            <Button className="w-full place-bid" onClick={() => navigate("/login", { state: { from: `/auctions/${a.id}` } })}>
              Sign in to bid <Icon name="arrow" />
            </Button>
          )}
        </>
      )}
      {notStarted && <p className="bid-disclaimer">Bidding opens {formatDateTime(a.startsAt)}.</p>}
    </div>
  );

  const specs: [string, string][] = [
    ["Year", String(a.bike.year)],
    ["Mileage", `${a.bike.mileageKm.toLocaleString("en-IN")} km`],
    ["Starting price", inr(a.startingPrice)],
    ["Bid increment", inr(a.minIncrement)],
    ["Total bids", String(a.bidCount)],
    ["Ends", formatDateTime(a.endsAt)],
  ];

  return (
    <div className="app-page">
      <TopNav active="Auctions" />
      <main className="detail-container">
        <button className="back-link" onClick={() => navigate("/auctions")}><Icon name="back" size={17} /> All auctions</button>
        <div className="detail-heading">
          <div>
            <div className="detail-title">{title}</div>
            <div className="detail-subtitle"><span>{a.bike.year}</span><i /><span>{a.bike.mileageKm.toLocaleString("en-IN")} km</span></div>
          </div>
          <div className="lot-id">LOT #RB-{String(a.id).padStart(5, "0")}</div>
        </div>

        <div className="detail-grid">
          <section className="detail-main">
            <div className="hero-image">{a.bike.imageUrl && <img src={a.bike.imageUrl} alt={title} />}</div>
            <div className="mobile-bid-card">{bidCard}</div>

            <div className="spec-card">
              <div className="section-title">Motorcycle details</div>
              <div className="spec-grid">
                {specs.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}
              </div>
              {a.bike.conditionNotes && (
                <div className="condition"><span>Condition notes</span><p>{a.bike.conditionNotes}</p></div>
              )}
            </div>

            <section className="history-card">
              <div className="history-header">
                <div>
                  <div className="section-title">Live bid history</div>
                  <span>{a.bidCount} {a.bidCount === 1 ? "bid" : "bids"} so far</span>
                </div>
                {canBid && <div className="live-indicator compact"><i /> {connected ? "Live" : "Reconnecting…"}</div>}
              </div>
              <div className="bid-list">
                {bids.length === 0 && <div style={{ padding: "16px 0", color: "var(--muted)" }}>No bids yet. Be the first to bid.</div>}
                {bids.map((b, i) => (
                  <div className={cx("bid-row", i === 0 && "top-bid")} key={b.id}>
                    <div className="rank">{i + 1}</div>
                    <div className="bidder">
                      <strong>{b.bidder}{b.userId === myId && <span>You</span>}</strong>
                      <small>{timeAgo(b.createdAt, now)}</small>
                    </div>
                    <strong className="bid-amount">{inr(b.amount)}</strong>
                  </div>
                ))}
              </div>
            </section>
          </section>

          <aside className="bid-aside">
            {bidCard}
            <div className="secure-note"><Icon name="shield" size={18} /><span>Every bid is checked and recorded by the server, so the leader is always correct.</span></div>
          </aside>
        </div>
      </main>
    </div>
  );
}