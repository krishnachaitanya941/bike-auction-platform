import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Auction, type AuctionList } from "../api";
import { formatDateTime, formatDuration, inr } from "../format";
import { useServerClock } from "../useClock";
import { Countdown, Icon, SelectField, StatusChip, TopNav, cx } from "../ui";

const TABS = [
  { label: "Live", status: "live" },
  { label: "Upcoming", status: "upcoming" },
  { label: "Ended", status: "ended" },
] as const;

function BikeCard({ a, now }: { a: Auction; now: number }) {
  const navigate = useNavigate();
  const open = () => navigate(`/auctions/${a.id}`);
  const title = `${a.bike.make} ${a.bike.model}`;

  let priceLabel = "Current bid";
  let price = inr(a.currentPrice);
  let timeLabel = "Ends in";
  let time = "";
  let urgent = false;

  if (a.status === "scheduled") {
    priceLabel = "Starting bid";
    price = inr(a.startingPrice);
    timeLabel = "Starts in";
    time = formatDuration(new Date(a.startsAt).getTime() - now);
  } else if (a.status === "live") {
    const ms = new Date(a.endsAt).getTime() - now;
    time = formatDuration(ms);
    urgent = ms < 5 * 60 * 1000;
  } else {
    priceLabel = a.highestBidderId ? "Final price" : "No bids";
    price = a.highestBidderId ? inr(a.currentPrice) : "—";
    timeLabel = "Ended";
    time = formatDateTime(a.endsAt);
  }

  return (
    <article
      className="bike-card"
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open()}
    >
      <div className="bike-image">
        {a.bike.imageUrl && <img src={a.bike.imageUrl} alt={title} />}
        <div className="image-shade" />
        <StatusChip status={a.status} />
      </div>
      <div className="bike-body">
        <div className="bike-heading"><div className="card-title">{title}</div><Icon name="arrow" size={18} /></div>
        <div className="bike-meta">
          <span>{a.bike.year}</span><i /><span>{a.bike.mileageKm.toLocaleString("en-IN")} km</span>
          <i /><span>{a.bidCount} {a.bidCount === 1 ? "bid" : "bids"}</span>
        </div>
        <div className="bike-bottom">
          <div><span className="eyebrow">{priceLabel}</span><strong className="price">{price}</strong></div>
          <div className="text-right"><span className="eyebrow">{timeLabel}</span><Countdown value={time} urgent={urgent} /></div>
        </div>
      </div>
    </article>
  );
}

export default function AuctionsPage() {
  const [status, setStatus] = useState<(typeof TABS)[number]["status"]>("live");
  const [sort, setSort] = useState("ending_soon");
  const [data, setData] = useState<AuctionList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const load = useCallback(async (silent = false) => {
    const mine = ++requestId.current;
    if (!silent) setLoading(true);
    try {
      const d = await api.listAuctions(status, sort);
      if (mine !== requestId.current) return;
      setData(d);
      setError(null);
    } catch (e) {
      if (mine !== requestId.current) return;
      setError((e as Error).message);
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [status, sort]);

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 10000);
    return () => clearInterval(t);
  }, [load]);

  const now = useServerClock(data?.serverTime);
  const counts = data?.counts;
  const countFor = (s: string) => (s === "live" ? counts?.live : s === "upcoming" ? counts?.upcoming : counts?.ended);

  return (
    <div className="app-page">
      <TopNav active="Auctions" />
      <main className="page-container">
        <header className="page-header">
          <div>
            <span className="overline">Discover your next ride</span>
            <div className="page-title">Motorcycle auctions</div>
            <p>Bid on verified motorcycles from trusted sellers across India.</p>
          </div>
          <div className="live-indicator"><i /> <span>{counts?.live ?? 0} auctions live now</span></div>
        </header>

        <div className="filter-bar">
          <div className="tabs filter-tabs">
            {TABS.map((t) => (
              <button key={t.status} className={cx(status === t.status && "active")} onClick={() => setStatus(t.status)}>
                {t.label}<span>{countFor(t.status) ?? 0}</span>
              </button>
            ))}
          </div>
          {status !== "ended" && (
            <div className="sort-row">
              <span>Sort by</span>
              <SelectField value={sort} onChange={setSort}>
                <option value="ending_soon">Ending soon</option>
                <option value="price_asc">Price low to high</option>
                <option value="price_desc">Price high to low</option>
              </SelectField>
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: "24px 0", color: "#fb7777" }}>
            {error} <button className="btn btn-secondary" onClick={() => load()}>Try again</button>
          </div>
        )}
        {loading && !data && <div style={{ padding: "48px 0", color: "var(--muted)" }}>Loading auctions…</div>}
        {data && data.auctions.length === 0 && !error && (
          <div style={{ padding: "48px 0", color: "var(--muted)" }}>No {status} auctions right now. Check back soon.</div>
        )}
        <section className="bike-grid">
          {data?.auctions.map((a) => <BikeCard key={a.id} a={a} now={now} />)}
        </section>
      </main>
    </div>
  );
}