import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

// Auto sign-out after N minutes of inactivity.
const IDLE_MINUTES = 30;

export function IdleTimer() {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    const ms = IDLE_MINUTES * 60 * 1000;
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        toast("Signed out due to inactivity.");
        await logout();
        navigate({ to: "/login", replace: true });
      }, ms);
    };
    const events: (keyof WindowEventMap)[] = ["mousemove", "keydown", "touchstart", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [user, logout, navigate]);

  return null;
}
