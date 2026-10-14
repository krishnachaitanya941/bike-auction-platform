export const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV
    ? "http://localhost:4000"
    : "https://bike-auction-platform-0zhd.onrender.com");
const TOKEN_KEY = "revbid_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  status: number;
  code: string;
  details?: any;
  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type Role = "user" | "admin";
export interface User { id: number; name: string; email: string; role: Role }
export type AuctionStatus = "scheduled" | "live" | "ended" | "cancelled";
export interface Auction {
  id: number;
  status: AuctionStatus;
  bike: {
    id: number; make: string; model: string; year: number;
    mileageKm: number; imageUrl: string | null; conditionNotes: string | null;
  };
  startingPrice: number;
  minIncrement: number;
  currentPrice: number;
  minNextBid: number;
  highestBidderId: number | null;
  bidCount: number;
  startsAt: string;
  endsAt: string;
}
export interface AuctionList {
  serverTime: string;
  counts: { live: number; upcoming: number; ended: number };
  auctions: Auction[];
}

export interface BidRow { id: number; userId: number; bidder: string; amount: number; createdAt: string }
export interface AuctionDetail { serverTime: string; auction: Auction; bids: BidRow[] }
export interface BidResult {
  auctionId: number;
  currentPrice: number;
  minNextBid: number;
  highestBidderId: number | null;
  endsAt: string;
  status: AuctionStatus;
  duplicate: boolean;
  bidId: number;
  extended?: boolean;
  previousHighestBidderId?: number | null;
}
export interface AdminStats {
  liveAuctions: number; scheduledAuctions: number; bidsToday: number;
  totalBids: number; users: number; soldCount: number; salesValue: number;
}
export interface AdminAuction {
  id: number; status: AuctionStatus;
  bike: { make: string; model: string; imageUrl: string | null };
  startingPrice: number; currentPrice: number; highestBidderId: number | null;
  bidCount: number; startsAt: string; endsAt: string;
}
export interface BikeOption { id: number; make: string; model: string; year: number; mileageKm: number; imageUrl: string | null }
export interface NewBike { make: string; model: string; year: number; mileageKm: number; conditionNotes?: string; imageUrl?: string }
export interface NewAuction { bikeId: number; startingPrice: number; minIncrement: number; startsAt: string; endsAt: string }

async function request<T>(
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Cannot reach the server. Check your connection and try again.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error;
    if (res.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event("revbid:logout"));
    }
    throw new ApiError(res.status, e?.code ?? "ERROR", e?.message ?? "Something went wrong.", e?.details);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>("/api/auth/login", { method: "POST", body: { email, password } }),
  register: (name: string, email: string, password: string) =>
    request<{ user: User; token: string }>("/api/auth/register", { method: "POST", body: { name, email, password } }),
  me: () => request<{ user: User }>("/api/auth/me"),
  listAuctions: (status: string, sort: string) =>
    request<AuctionList>(`/api/auctions?status=${status}&sort=${sort}`),
    getAuction: (id: number) => request<AuctionDetail>(`/api/auctions/${id}`),
  placeBid: (id: number, amount: number, requestId: string) =>
    request<BidResult>(`/api/auctions/${id}/bids`, { method: "POST", body: { amount, requestId } }),
    adminStats: () => request<AdminStats>("/api/admin/stats"),
  adminAuctions: () => request<{ auctions: AdminAuction[] }>("/api/admin/auctions"),
  listBikes: () => request<{ bikes: BikeOption[] }>("/api/bikes"),
  createBike: (b: NewBike) => request<{ id: number }>("/api/bikes", { method: "POST", body: b }),
  createAuction: (a: NewAuction) => request<{ id: number }>("/api/auctions", { method: "POST", body: a }),
  cancelAuction: (id: number) => request<{ id: number; status: string }>(`/api/auctions/${id}/cancel`, { method: "PATCH" }),
};