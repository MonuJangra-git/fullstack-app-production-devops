import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";

import Landing from "./pages/Landing";
import Workspaces from "./pages/Workspaces";
import WorkspaceDashboard from "./pages/WorkspaceDashboard";
import WorkspaceProjects from "./pages/WorkspaceProjects";
import ProjectBoard from "./pages/ProjectBoard";
import Members from "./pages/Members";
import StudyHub from "./pages/StudyHub";
import Shell from "./components/layout/Shell";
import NotFound from "./pages/not-found";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(217 100% 55%)",
    colorForeground: "hsl(210 20% 98%)",
    colorMutedForeground: "hsl(215 15% 60%)",
    colorDanger: "hsl(350 80% 55%)",
    colorBackground: "hsl(230 20% 6%)",
    colorInput: "hsl(230 20% 12%)",
    colorInputForeground: "hsl(210 20% 98%)",
    colorNeutral: "hsl(230 20% 12%)",
    fontFamily: "'Outfit', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card rounded-2xl w-[440px] max-w-full overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,102,255,0.1)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold tracking-tight text-white",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "font-medium text-white",
    formFieldLabel: "text-sm font-medium text-white",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-destructive",
    logoBox: "mb-6 flex justify-center",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "border border-white/10 hover:bg-white/5 transition-colors",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,102,255,0.3)] transition-all",
    formFieldInput: "flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary/50 text-white",
    footerAction: "mt-6 text-center text-sm",
    dividerLine: "bg-white/10",
    alert: "bg-destructive/10 border border-destructive/20 text-destructive",
    otpCodeFieldInput: "border-white/10 bg-black/20 text-white focus:ring-primary focus:border-primary",
    formFieldRow: "space-y-4",
    main: "w-full",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="z-10 w-full max-w-md">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="z-10 w-full max-w-md">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/workspaces" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component, shell = true }: { component: React.ComponentType, shell?: boolean }) {
  return (
    <>
      <Show when="signed-in">
        {shell ? (
          <Shell>
            <Component />
          </Shell>
        ) : (
          <Component />
        )}
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Access TaskFlow",
            subtitle: "Enter your credentials to continue",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Route path="/workspaces">
              {() => <ProtectedRoute component={Workspaces} shell={false} />}
            </Route>
            <Route path="/workspaces/:workspaceId">
              {() => <ProtectedRoute component={WorkspaceDashboard} />}
            </Route>
            <Route path="/workspaces/:workspaceId/projects">
              {() => <ProtectedRoute component={WorkspaceProjects} />}
            </Route>
            <Route path="/workspaces/:workspaceId/projects/:projectId">
              {() => <ProtectedRoute component={ProjectBoard} />}
            </Route>
            <Route path="/workspaces/:workspaceId/members">
              {() => <ProtectedRoute component={Members} />}
            </Route>
            <Route path="/workspaces/:workspaceId/study-hub">
              {() => <ProtectedRoute component={StudyHub} />}
            </Route>
            
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;