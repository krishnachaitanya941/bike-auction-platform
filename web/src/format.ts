export const inr = (n: number) => "₹" + Number(n).toLocaleString("en-IN");

export function formatDuration(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

export function timeAgo(iso: string, nowMs = Date.now()) {
  const s = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (s < 10) return "Just now";
  if (s < 60) return `${s} sec ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
}