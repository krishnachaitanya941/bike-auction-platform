import { useState, type ReactNode } from "react";

type Screen = "login" | "auctions" | "detail" | "admin" | "create";
type BidState = "winning" | "outbid" | "ended";

const photos = [
  "https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1588627541420-fce3f661b779?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=85",
];

const bikes = [
  { name: "Royal Enfield Classic 350", year: "2022", km: "8,420 km", price: "₹1,48,500", time: "02:14:33" },
  { name: "KTM Duke 390", year: "2023", km: "5,180 km", price: "₹2,72,000", time: "00:03:48", urgent: true },
  { name: "Yamaha R15 V4", year: "2022", km: "11,240 km", price: "₹1,56,500", time: "01:47:09" },
  { name: "Bajaj Pulsar NS200", year: "2021", km: "16,900 km", price: "₹98,000", time: "05:22:17" },
  { name: "Honda CB350", year: "2023", km: "4,650 km", price: "₹1,92,500", time: "00:04:21", urgent: true },
  { name: "TVS Apache RTR 200", year: "2022", km: "9,860 km", price: "₹1,12,000", time: "03:18:42" },
];

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

function Icon({ name, size = 18 }: { name: string; size?: number }) {
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
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="logo-mark"><span>R</span></div>
      {!compact && <div className="text-xl font-bold tracking-tight">Rev<span className="text-accent">Bid</span></div>}
    </div>
  );
}

function Button({ children, variant = "primary", className, onClick, type = "button" }: {
  children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger"; className?: string; onClick?: () => void; type?: "button" | "submit";
}) {
  return <button type={type} onClick={onClick} className={cx("btn", `btn-${variant}`, className)}>{children}</button>;
}

function Field({ label, placeholder, type = "text", error, prefix, defaultValue }: {
  label: string; placeholder?: string; type?: string; error?: string; prefix?: string; defaultValue?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className={cx("input-shell", error && "input-error")}>
        {prefix && <span className="text-muted">{prefix}</span>}
        <input type={type} placeholder={placeholder} defaultValue={defaultValue} />
      </div>
      {error && <span className="error-text">{error}</span>}
    </label>
  );
}

function SelectField({ label, children, error }: { label?: string; children: ReactNode; error?: string }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      <div className={cx("select-shell", error && "input-error")}>
        <select>{children}</select><Icon name="chevron" size={16} />
      </div>
      {error && <span className="error-text">{error}</span>}
    </label>
  );
}

function StatusChip({ status }: { status: "Live" | "Scheduled" | "Ended" }) {
  return <span className={cx("status-chip", `status-${status.toLowerCase()}`)}><i />{status}</span>;
}

function Countdown({ value, urgent = false, large = false }: { value: string; urgent?: boolean; large?: boolean }) {
  return (
    <div className={cx("countdown", urgent && "text-danger", large && "countdown-large")}>
      <Icon name="clock" size={large ? 20 : 16} /><span>{value}</span>
    </div>
  );
}

function TopNav({ active = "Auctions", onNavigate }: { active?: string; onNavigate: (s: Screen) => void }) {
  return (
    <nav className="topnav">
      <button className="logo-button" onClick={() => onNavigate("auctions")}><Logo /></button>
      <div className="nav-links">
        <button className={active === "Auctions" ? "active" : ""} onClick={() => onNavigate("auctions")}>Auctions</button>
        <button className={active === "My bids" ? "active" : ""}>My bids</button>
      </div>
      <div className="nav-user"><div><strong>Arjun Mehta</strong><span>Bidder</span></div><div className="avatar">AM</div><Icon name="chevron" size={15} /></div>
    </nav>
  );
}

function BikeCard({ bike, image, onClick }: { bike: typeof bikes[number]; image: string; onClick: () => void }) {
  return (
    <article className="bike-card" onClick={onClick}>
      <div className="bike-image">
        <img src={image} alt={bike.name} />
        <div className="image-shade" />
        <StatusChip status="Live" />
      </div>
      <div className="bike-body">
        <div className="bike-heading"><div className="card-title">{bike.name}</div><Icon name="arrow" size={18} /></div>
        <div className="bike-meta"><span>{bike.year}</span><i /><span>{bike.km}</span></div>
        <div className="bike-bottom">
          <div><span className="eyebrow">Current bid</span><strong className="price">{bike.price}</strong></div>
          <div className="text-right"><span className="eyebrow">Ends in</span><Countdown value={bike.time} urgent={bike.urgent} /></div>
        </div>
      </div>
    </article>
  );
}

function LoginScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  return (
    <main className="login-screen">
      <section className="login-visual">
        <img src={photos[1]} alt="KTM motorcycle on an open road" />
        <div className="login-overlay" />
        <div className="visual-brand"><Logo /><div className="display-copy">Find your next ride.<br /><span>Bid with confidence.</span></div><p>Verified motorcycles. Transparent auctions. No surprises.</p></div>
        <div className="trust-row"><span><Icon name="shield" size={17} /> Verified listings</span><span>10,000+ trusted riders</span></div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-logo"><Logo /></div>
          <div className="auth-kicker">Welcome to RevBid</div>
          <div className="auth-title">{mode === "signin" ? "Sign in to your account" : "Create your account"}</div>
          <p>{mode === "signin" ? "Continue bidding on motorcycles you love." : "Join thousands of motorcycle enthusiasts."}</p>
          <div className="tabs auth-tabs"><button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button><button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button></div>
          <div className="auth-fields">
            {mode === "register" && <Field label="Full name" placeholder="Enter your full name" />}
            <Field label="Email address" type="email" placeholder="you@example.com" />
            <Field label="Password" type="password" placeholder="At least 8 characters" error={mode === "signin" ? "That email or password doesn’t look right. Please try again." : undefined} />
          </div>
          <Button className="w-full" onClick={() => onNavigate("auctions")}>{mode === "signin" ? "Sign in" : "Create account"}<Icon name="arrow" size={18} /></Button>
          <div className="terms">By continuing, you agree to our <u>Terms</u> and <u>Privacy Policy</u>.</div>
        </div>
      </section>
    </main>
  );
}

function AuctionsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [tab, setTab] = useState("Live");
  return (
    <div className="app-page">
      <TopNav onNavigate={onNavigate} />
      <main className="page-container">
        <header className="page-header">
          <div><span className="overline">Discover your next ride</span><div className="page-title">Live auctions</div><p>Bid on verified motorcycles from trusted sellers across India.</p></div>
          <div className="live-indicator"><i /> <span>6 auctions live now</span></div>
        </header>
        <div className="filter-bar">
          <div className="tabs filter-tabs">{["Live", "Upcoming", "Ended"].map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}{t === "Live" && <span>6</span>}</button>)}</div>
          <div className="sort-row"><span>Sort by</span><SelectField><option>Ending soon</option><option>Price low to high</option><option>Price high to low</option></SelectField></div>
        </div>
        <section className="bike-grid">{bikes.map((bike, i) => <BikeCard key={bike.name} bike={bike} image={photos[i]} onClick={() => onNavigate("detail")} />)}</section>
      </main>
    </div>
  );
}

const history = [
  { name: "Arjun M.", amount: "₹2,72,000", time: "Just now", you: true },
  { name: "Vikram S.", amount: "₹2,70,000", time: "42 sec ago" },
  { name: "Neeraj K.", amount: "₹2,68,000", time: "2 min ago" },
  { name: "Vikram S.", amount: "₹2,65,000", time: "4 min ago" },
];

function BidBanner({ state }: { state: BidState }) {
  if (state === "ended") return <div className="bid-banner banner-ended"><div className="banner-icon"><Icon name="gavel" /></div><div><strong>Auction ended</strong><span>Winner: Arjun M. at ₹2,72,000</span></div></div>;
  const winning = state === "winning";
  return <div className={cx("bid-banner", winning ? "banner-winning" : "banner-outbid")}><div className="banner-icon">{winning ? <Icon name="shield" /> : <Icon name="gavel" />}</div><div><strong>{winning ? "You are the highest bidder" : "You’ve been outbid"}</strong><span>{winning ? "We’ll notify you if someone places a higher bid." : "Place a new bid to get back in the lead."}</span></div></div>;
}

function DetailScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [state, setState] = useState<BidState>("winning");
  const [thumb, setThumb] = useState(0);
  const gallery = [photos[1], photos[0], photos[3], photos[5]];
  return (
    <div className="app-page">
      <TopNav onNavigate={onNavigate} />
      <main className="detail-container">
        <button className="back-link" onClick={() => onNavigate("auctions")}><Icon name="back" size={17} /> All auctions</button>
        <div className="detail-heading">
          <div><div className="detail-title">KTM Duke 390</div><div className="detail-subtitle"><span>2023</span><i /><span>5,180 km</span><i /><span>Delhi NCR</span></div></div>
          <div className="lot-id">LOT #RB-23091</div>
        </div>
        <div className="detail-grid">
          <section className="detail-main">
            <div className="hero-image"><img src={gallery[thumb]} alt="2023 KTM Duke 390" /></div>
            <div className="thumbnails">{gallery.map((p, i) => <button key={p} className={thumb === i ? "selected" : ""} onClick={() => setThumb(i)}><img src={p} alt={`Motorcycle view ${i + 1}`} /></button>)}</div>
            <div className="mobile-bid-card"><BidCard state={state} /></div>
            <div className="spec-card">
              <div className="section-title">Motorcycle details</div>
              <div className="spec-grid">
                {[["Year", "2023"], ["Mileage", "5,180 km"], ["Owners", "1st owner"], ["Registration", "Delhi"], ["Fuel", "Petrol"], ["Insurance", "Valid until Oct 2025"]].map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}
              </div>
              <div className="condition"><span>Condition notes</span><p>Excellent mechanical condition with complete service history. Minor cosmetic scratch on the right tank panel. Tyres recently replaced.</p></div>
            </div>
            <section className="history-card">
              <div className="history-header"><div><div className="section-title">Live bid history</div><span>18 bids from 7 bidders</span></div><div className="live-indicator compact"><i /> Live</div></div>
              <div className="bid-list">{history.map((bid, i) => <div className={cx("bid-row", i === 0 && "top-bid")} key={`${bid.name}-${bid.amount}`}><div className="rank">{i === 0 ? "1" : i + 1}</div><div className="bidder"><strong>{bid.name}{bid.you && <span>You</span>}</strong><small>{bid.time}</small></div><strong className="bid-amount">{bid.amount}</strong></div>)}</div>
            </section>
          </section>
          <aside className="bid-aside">
            <div className="variant-switch"><span>Preview state</span>{(["winning", "outbid", "ended"] as BidState[]).map((s) => <button key={s} onClick={() => setState(s)} className={state === s ? "active" : ""}>{s}</button>)}</div>
            <BidCard state={state} />
            <div className="secure-note"><Icon name="shield" size={18} /><span>Secure bidding. Your payment details remain protected.</span></div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function BidCard({ state }: { state: BidState }) {
  const ended = state === "ended";
  return (
    <div className="bid-card">
      <BidBanner state={state} />
      <div className="bid-card-top"><div><span className="eyebrow">Current bid</span><div className="bid-price">₹2,72,000</div></div><StatusChip status={ended ? "Ended" : "Live"} /></div>
      {!ended && <div className="timer-panel"><span>Auction ends in</span><Countdown value="00:03:48" urgent large /><small>Today, 8:30 PM</small></div>}
      <div className="bid-facts"><div><span>{ended ? "Winner" : "Highest bidder"}</span><strong>{ended ? "Arjun M." : state === "winning" ? "You (Arjun M.)" : "Vikram S."}</strong></div><div><span>Total bids</span><strong>18</strong></div></div>
      {!ended && <><div className="min-bid"><span>Minimum next bid</span><strong>₹2,74,000</strong></div><Field label="Your bid amount" prefix="₹" defaultValue="274000" /><div className="quick-bids">{["+500", "+1,000", "+2,000"].map((x) => <Button key={x} variant="secondary">{x}</Button>)}</div><Button className="w-full place-bid">Place bid <Icon name="arrow" /></Button><p className="bid-disclaimer">By placing a bid, you agree to complete the purchase if you win.</p></>}
    </div>
  );
}

const auctionRows = [
  { bike: "KTM Duke 390", status: "Live" as const, price: "₹2,72,000", bids: "18", end: "Today, 8:30 PM", image: photos[1] },
  { bike: "Royal Enfield Classic 350", status: "Live" as const, price: "₹1,48,500", bids: "12", end: "Today, 10:45 PM", image: photos[0] },
  { bike: "Honda CB350", status: "Scheduled" as const, price: "₹1,50,000", bids: "—", end: "Tomorrow, 6:00 PM", image: photos[4] },
  { bike: "Yamaha R15 V4", status: "Ended" as const, price: "₹1,56,500", bids: "24", end: "18 Jun, 7:15 PM", image: photos[2] },
  { bike: "TVS Apache RTR 200", status: "Scheduled" as const, price: "₹90,000", bids: "—", end: "21 Jun, 8:00 PM", image: photos[5] },
];

function Sidebar({ active, onNavigate }: { active: string; onNavigate: (s: Screen) => void }) {
  return (
    <aside className="sidebar">
      <div className="side-logo"><Logo /></div>
      <div className="side-label">Workspace</div>
      <div className="side-nav">
        {[["Dashboard", "grid"], ["Auctions", "gavel"], ["Bikes", "bike"], ["Users", "users"]].map(([label, icon]) => <button key={label} className={active === label ? "active" : ""} onClick={() => label === "Dashboard" && onNavigate("admin")}><Icon name={icon} /><span>{label}</span>{label === "Auctions" && <small>24</small>}</button>)}
      </div>
      <div className="admin-profile"><div className="avatar">AM</div><div><strong>Arjun Mehta</strong><span>Administrator</span></div></div>
    </aside>
  );
}

function AdminDashboard({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const stats = [
    ["Live auctions", "6", "+2 this week", "gavel"],
    ["Total bids today", "184", "+12.5% vs yesterday", "grid"],
    ["Registered users", "8,492", "+48 this week", "users"],
    ["Revenue", "₹12.8L", "+8.2% this month", "shield"],
  ];
  return (
    <div className="admin-layout">
      <Sidebar active="Dashboard" onNavigate={onNavigate} />
      <main className="admin-main">
        <header className="admin-header"><div><span>Admin console</span><div className="page-title">Dashboard</div></div><Button onClick={() => onNavigate("create")}><Icon name="plus" /> Create auction</Button></header>
        <section className="stats-grid">{stats.map(([label, value, delta, icon]) => <div className="stat-card" key={label}><div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon name={icon} /></div></div><strong>{value}</strong><small>{delta}</small></div>)}</section>
        <section className="table-card">
          <div className="table-header"><div><div className="section-title">Recent auctions</div><span>Manage and monitor all motorcycle auctions.</span></div><Button variant="secondary">View all <Icon name="arrow" size={16} /></Button></div>
          <div className="auction-table">
            <div className="table-row table-head"><span>Bike</span><span>Status</span><span>Current price</span><span>Bids</span><span>Ends at</span><span>Actions</span></div>
            {auctionRows.map((r) => <div className="table-row" key={r.bike}><div className="table-bike"><img src={r.image} alt="" /><strong>{r.bike}</strong></div><div><StatusChip status={r.status} /></div><strong>{r.price}</strong><span>{r.bids}</span><span>{r.end}</span><div className="row-actions"><Button variant="ghost"><Icon name="edit" size={16} /> Edit</Button>{r.status !== "Ended" && <Button variant="danger"><Icon name="x" size={16} /> Cancel</Button>}</div></div>)}
          </div>
        </section>
      </main>
    </div>
  );
}

function CreateAuction({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="admin-layout">
      <Sidebar active="Auctions" onNavigate={onNavigate} />
      <main className="admin-main form-page">
        <button className="back-link" onClick={() => onNavigate("admin")}><Icon name="back" size={17} /> Back to auctions</button>
        <header className="form-header"><div><div className="page-title">Create auction</div><p>Set up a new live motorcycle auction.</p></div></header>
        <form className="auction-form" onSubmit={(e) => e.preventDefault()}>
          <section className="form-section">
            <div className="form-section-heading"><div className="step">1</div><div><div className="section-title">Motorcycle</div><p>Select the verified motorcycle you want to list.</p></div></div>
            <SelectField label="Select bike" error="Please select a motorcycle to continue."><option value="">Choose a motorcycle</option><option>KTM Duke 390 — DL 3S CT 4821</option><option>Honda CB350 — DL 8S BK 9214</option></SelectField>
          </section>
          <section className="form-section">
            <div className="form-section-heading"><div className="step">2</div><div><div className="section-title">Pricing</div><p>Define the opening price and bid increment.</p></div></div>
            <div className="form-grid"><Field label="Starting price" prefix="₹" placeholder="e.g. 150000" /><Field label="Minimum increment" prefix="₹" defaultValue="2000" /><div className="field-hint">Set a competitive reserve based on the bike’s valuation.</div><div className="field-hint">Bids must increase by at least this amount.</div></div>
          </section>
          <section className="form-section">
            <div className="form-section-heading"><div className="step">3</div><div><div className="section-title">Schedule</div><p>Choose when bidding opens and closes.</p></div></div>
            <div className="form-grid schedule-grid"><Field label="Start date" type="date" defaultValue="2025-06-20" /><Field label="Start time" type="time" defaultValue="10:00" /><Field label="End date" type="date" error="End date must be after the start date." defaultValue="2025-06-19" /><Field label="End time" type="time" defaultValue="20:30" /></div>
          </section>
          <div className="form-actions"><Button variant="secondary" onClick={() => onNavigate("admin")}>Cancel</Button><Button type="submit">Save auction <Icon name="arrow" size={18} /></Button></div>
        </form>
      </main>
    </div>
  );
}

function ScreenSwitcher({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  const screens: [Screen, string][] = [["login", "01"], ["auctions", "02"], ["detail", "03"], ["admin", "04"], ["create", "05"]];
  return <div className="screen-switcher"><span>SCREEN</span>{screens.map(([key, label]) => <button key={key} className={active === key ? "active" : ""} onClick={() => onChange(key)} title={key}>{label}</button>)}</div>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("auctions");
  const content = screen === "login" ? <LoginScreen onNavigate={setScreen} /> :
    screen === "auctions" ? <AuctionsScreen onNavigate={setScreen} /> :
      screen === "detail" ? <DetailScreen onNavigate={setScreen} /> :
        screen === "admin" ? <AdminDashboard onNavigate={setScreen} /> :
          <CreateAuction onNavigate={setScreen} />;
  return <>{content}<ScreenSwitcher active={screen} onChange={setScreen} /></>;
}
