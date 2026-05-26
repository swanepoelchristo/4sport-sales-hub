import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter,
  HeadContent, Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { StoreProvider } from "@/lib/store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center brand-gradient-bg px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl brand-gradient-text">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Page not found.</p>
        <Link to="/" className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center brand-gradient-bg px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "4SPORT Sales Rep Dashboard" },
      { name: "description", content: "4SPORT sales rep dashboard — leads, meetings, signups and commissions for schools, clubs and sports regions in South Africa." },
      { name: "theme-color", content: "#0b1530" },
      { property: "og:title", content: "4SPORT Sales Rep Dashboard" },
      { property: "og:description", content: "Eyes on the game — sales pipeline for 4SPORT South Africa." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <Outlet />
      </StoreProvider>
    </QueryClientProvider>
  );
}
