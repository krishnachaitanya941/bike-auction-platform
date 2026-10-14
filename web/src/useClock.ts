import { useEffect, useMemo, useState } from "react";

export function useServerClock(serverTime?: string) {
  const [, setTick] = useState(0);
  const offset = useMemo(
    () => (serverTime ? new Date(serverTime).getTime() - Date.now() : 0),
    [serverTime]
  );
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return Date.now() + offset;
}