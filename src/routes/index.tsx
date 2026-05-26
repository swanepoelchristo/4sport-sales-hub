import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user } = useStore();
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}
