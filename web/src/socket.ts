import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { AuctionStatus, BidRow } from "./api";

const URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

let socket: Socket | null = null;
function getSocket(): Socket {
  if (!socket) socket = io(URL, { transports: ["websocket", "polling"], reconnectionDelayMax: 5000 });
  return socket;
}

export interface LobbyUpdate {
  auctionId: number;
  currentPrice: number;
  minNextBid: number;
  highestBidderId: number | null;
  bidCount: number;
  endsAt: string;
  status: AuctionStatus;
  serverTime: string;
}
export interface BidEvent extends LobbyUpdate {
  extended: boolean;
  previousHighestBidderId: number | null;
  bid: BidRow;
}
export interface StatusEvent { auctionId: number; status: AuctionStatus }

type Join = { event: "lobby:join" } | { event: "auction:join"; auctionId: number };

/** Joins a room, listens for events, and reports whether the live connection is up. */
export function useRealtime(
  join: Join | null,
  listeners: Record<string, (data: any) => void>,
  onReconnect?: () => void
) {
  const [connected, setConnected] = useState(false);
  const latest = useRef({ listeners, onReconnect });
  latest.current = { listeners, onReconnect };
  const joinKey = join ? JSON.stringify(join) : "";

  useEffect(() => {
    if (!joinKey) return;
    const s = getSocket();
    const j = JSON.parse(joinKey) as Join;

    const handlers = Object.keys(latest.current.listeners).map(
      (name) => [name, (d: unknown) => latest.current.listeners[name]?.(d)] as const
    );
    handlers.forEach(([name, h]) => s.on(name, h));

    const joinNow = () => {
      if (j.event === "lobby:join") s.emit("lobby:join");
      else s.emit("auction:join", { auctionId: j.auctionId });
    };

    let seenConnect = s.connected;
    const onConnect = () => {
      setConnected(true);
      joinNow();
      if (seenConnect) latest.current.onReconnect?.(); // refetch anything missed while offline
      seenConnect = true;
    };
    const onDisconnect = () => setConnected(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    if (s.connected) {
      setConnected(true);
      joinNow();
    }

    return () => {
      handlers.forEach(([name, h]) => s.off(name, h));
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      if (s.connected && j.event === "auction:join") s.emit("auction:leave");
      setConnected(false);
    };
  }, [joinKey]);

  return connected;
}