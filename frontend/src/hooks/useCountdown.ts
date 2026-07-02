import { useEffect, useState } from "react";

// Returns remaining seconds until `iso`, or 0 if past/null. Ticks every second.
export function useCountdown(iso: string | null | undefined): number {
  const compute = () => {
    if (!iso) return 0;
    const diff = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  };
  const [remaining, setRemaining] = useState(compute);

  useEffect(() => {
    setRemaining(compute());
    if (!iso) return;
    const t = setInterval(() => setRemaining(compute()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);

  return remaining;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
