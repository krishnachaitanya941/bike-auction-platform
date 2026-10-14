import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, type BikeOption } from "../api";
import { Button, Field, Icon, SelectField } from "../ui";
import AdminShell from "./AdminShell";

const p = (n: number) => String(n).padStart(2, "0");
const dateStr = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
const timeStr = (d: Date) => `${p(d.getHours())}:${p(d.getMinutes())}`;
const digits = (v: string) => v.replace(/[^\d]/g, "");

function defaults() {
  const s = new Date(Date.now() + 10 * 60 * 1000);
  const e = new Date(s.getTime() + 2 * 60 * 60 * 1000);
  return { sd: dateStr(s), st: timeStr(s), ed: dateStr(e), et: timeStr(e) };
}

type Errors = Record<string, string>;

function serverErrors(err: unknown): { fields: Errors; message: string | null } {
  if (err instanceof ApiError && err.status === 422 && Array.isArray(err.details)) {
    const fields: Errors = {};
    for (const d of err.details as { field?: string; message?: string }[]) {
      if (d.field && d.message && !fields[d.field]) fields[d.field] = d.message;
    }
    return { fields, message: null };
  }
  return { fields: {}, message: (err as Error).message };
}

export default function CreateAuctionPage() {
  const navigate = useNavigate();
  const init = defaults();

  const [bikes, setBikes] = useState<BikeOption[]>([]);
  const [bikeId, setBikeId] = useState("");
  const [starting, setStarting] = useState("");
  const [increment, setIncrement] = useState("2000");
  const [sd, setSd] = useState(init.sd);
  const [st, setSt] = useState(init.st);
  const [ed, setEd] = useState(init.ed);
  const [et, setEt] = useState(init.et);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showBike, setShowBike] = useState(false);
  const [bk, setBk] = useState({ make: "", model: "", year: "", km: "", image: "", notes: "" });
  const [bikeErrors, setBikeErrors] = useState<Errors>({});
  const [bikeBusy, setBikeBusy] = useState(false);
  const [bikeFormError, setBikeFormError] = useState<string | null>(null);

  const loadBikes = useCallback(async () => {
    try {
      const r = await api.listBikes();
      setBikes(r.bikes);
    } catch (e) {
      setFormError((e as Error).message);
    }
  }, []);
  useEffect(() => { loadBikes(); }, [loadBikes]);

  function validate(): { errors: Errors; start?: Date; end?: Date } {
    const e: Errors = {};
    if (!bikeId) e.bikeId = "Please select a motorcycle to continue.";
    const sp = Number(starting);
    if (!starting || !Number.isFinite(sp) || sp <= 0) e.startingPrice = "Enter a starting price above zero.";
    const inc = Number(increment);
    if (!increment || !Number.isFinite(inc) || inc <= 0) e.minIncrement = "Enter an increment above zero.";
    const start = new Date(`${sd}T${st}`);
    const end = new Date(`${ed}T${et}`);
    if (!sd || !st || isNaN(start.getTime())) e.startsAt = "Choose a start date and time.";
    if (!ed || !et || isNaN(end.getTime())) e.endsAt = "Choose an end date and time.";
    else if (!e.startsAt && end <= start) e.endsAt = "End must be after the start.";
    else if (end.getTime() <= Date.now()) e.endsAt = "End must be in the future.";
    return { errors: e, start, end };
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setFormError(null);
    const { errors: e, start, end } = validate();
    setErrors(e);
    if (Object.keys(e).length || !start || !end) return;

    setBusy(true);
    try {
      await api.createAuction({
        bikeId: Number(bikeId),
        startingPrice: Number(starting),
        minIncrement: Number(increment),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      });
      navigate("/admin", { state: { notice: "Auction created." } });
    } catch (err) {
      const s = serverErrors(err);
      setErrors(s.fields);
      setFormError(s.message);
    } finally {
      setBusy(false);
    }
  }

  async function addBike() {
    setBikeFormError(null);
    const e: Errors = {};
    const year = Number(bk.year);
    const km = Number(bk.km);
    if (bk.make.trim().length < 2) e.make = "Enter the make.";
    if (!bk.model.trim()) e.model = "Enter the model.";
    if (!bk.year || year < 1980 || year > new Date().getFullYear() + 1) e.year = "Enter a valid year.";
    if (bk.km === "" || !Number.isFinite(km)) e.mileageKm = "Enter the mileage in km.";
    if (bk.image && !/^https?:\/\//i.test(bk.image.trim())) e.imageUrl = "Use a full link starting with https://";
    setBikeErrors(e);
    if (Object.keys(e).length) return;

    setBikeBusy(true);
    try {
      const created = await api.createBike({
        make: bk.make.trim(),
        model: bk.model.trim(),
        year,
        mileageKm: km,
        ...(bk.notes.trim() ? { conditionNotes: bk.notes.trim() } : {}),
        ...(bk.image.trim() ? { imageUrl: bk.image.trim() } : {}),
      });
      await loadBikes();
      setBikeId(String(created.id));
      setErrors((x) => ({ ...x, bikeId: "" }));
      setBk({ make: "", model: "", year: "", km: "", image: "", notes: "" });
      setShowBike(false);
    } catch (err) {
      const s = serverErrors(err);
      setBikeErrors(s.fields);
      setBikeFormError(s.message);
    } finally {
      setBikeBusy(false);
    }
  }

  return (
    <AdminShell active="new" mainClass="form-page">
      <button className="back-link" onClick={() => navigate("/admin")}><Icon name="back" size={17} /> Back to dashboard</button>
      <header className="form-header">
        <div><div className="page-title">Create auction</div><p>Set up a new live motorcycle auction.</p></div>
      </header>

      <form className="auction-form" onSubmit={submit} noValidate>
        <section className="form-section">
          <div className="form-section-heading"><div className="step">1</div><div><div className="section-title">Motorcycle</div><p>Select the motorcycle you want to list.</p></div></div>
          <SelectField label="Select bike" value={bikeId} onChange={(v) => { setBikeId(v); setErrors((x) => ({ ...x, bikeId: "" })); }} error={errors.bikeId || undefined}>
            <option value="">Choose a motorcycle</option>
            {bikes.map((b) => <option key={b.id} value={b.id}>{b.make} {b.model} ({b.year})</option>)}
          </SelectField>
          <div style={{ marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setShowBike((s) => !s)}>
              <Icon name={showBike ? "x" : "plus"} size={16} /> {showBike ? "Close" : "Add a new bike"}
            </Button>
          </div>
          {showBike && (
            <div style={{ marginTop: 16 }}>
              <div className="form-grid">
                <Field label="Make" placeholder="e.g. Royal Enfield" value={bk.make} onChange={(v) => setBk({ ...bk, make: v })} error={bikeErrors.make} />
                <Field label="Model" placeholder="e.g. Classic 350" value={bk.model} onChange={(v) => setBk({ ...bk, model: v })} error={bikeErrors.model} />
                <Field label="Year" placeholder="e.g. 2022" inputMode="numeric" value={bk.year} onChange={(v) => setBk({ ...bk, year: digits(v) })} error={bikeErrors.year} />
                <Field label="Mileage (km)" placeholder="e.g. 8420" inputMode="numeric" value={bk.km} onChange={(v) => setBk({ ...bk, km: digits(v) })} error={bikeErrors.mileageKm} />
                <Field label="Photo link (optional)" placeholder="https://…" value={bk.image} onChange={(v) => setBk({ ...bk, image: v })} error={bikeErrors.imageUrl} />
                <Field label="Condition notes (optional)" placeholder="Service history, scratches…" value={bk.notes} onChange={(v) => setBk({ ...bk, notes: v })} error={bikeErrors.conditionNotes} />
              </div>
              {bikeFormError && <div role="alert" className="error-text" style={{ marginTop: 8 }}>{bikeFormError}</div>}
              <div style={{ marginTop: 12 }}>
                <Button disabled={bikeBusy} onClick={addBike}>{bikeBusy ? "Saving…" : "Save bike"}</Button>
              </div>
            </div>
          )}
        </section>

        <section className="form-section">
          <div className="form-section-heading"><div className="step">2</div><div><div className="section-title">Pricing</div><p>Define the opening price and bid increment.</p></div></div>
          <div className="form-grid">
            <Field label="Starting price" prefix="₹" placeholder="e.g. 150000" inputMode="numeric" value={starting} onChange={(v) => setStarting(digits(v))} error={errors.startingPrice || undefined} />
            <Field label="Minimum increment" prefix="₹" inputMode="numeric" value={increment} onChange={(v) => setIncrement(digits(v))} error={errors.minIncrement || undefined} />
            <div className="field-hint">Set a competitive price based on the bike's valuation.</div>
            <div className="field-hint">Bids must increase by at least this amount.</div>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading"><div className="step">3</div><div><div className="section-title">Schedule</div><p>Choose when bidding opens and closes (your local time).</p></div></div>
          <div className="form-grid schedule-grid">
            <Field label="Start date" type="date" value={sd} onChange={setSd} error={errors.startsAt || undefined} />
            <Field label="Start time" type="time" value={st} onChange={setSt} />
            <Field label="End date" type="date" value={ed} onChange={setEd} error={errors.endsAt || undefined} />
            <Field label="End time" type="time" value={et} onChange={setEt} />
          </div>
        </section>

        {formError && <div role="alert" className="error-text" style={{ marginBottom: 12 }}>{formError}</div>}
        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate("/admin")}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save auction"} {!busy && <Icon name="arrow" size={18} />}</Button>
        </div>
      </form>
    </AdminShell>
  );
}