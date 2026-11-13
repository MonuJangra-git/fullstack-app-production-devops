import { FormEvent, useState } from "react";
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, AuthProvider } from "./lib/auth";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { signIn, signUp } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "sign-in") await signIn(email, password);
      else await signUp(name, email, password);
      queryClient.clear();
      setLocation("/workspaces");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-card p-8 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold">{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use your TaskFlow account to continue.</p>
        </div>
        {mode === "sign-up" && (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={name} onChange={(event) => setName(event.target.value)} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
        </Button>
        <button type="button" className="w-full text-sm text-primary" onClick={() => setLocation(mode === "sign-in" ? "/sign-up" : "/sign-in")}>
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
        {mode === "sign-in" && (
          <button type="button" className="w-full text-sm text-primary" onClick={() => setLocation("/forgot-password")}>
            Forgot your password?
          </button>
        )}
      </form>
    </div>
  );
}

function ForgotPasswordPage() {
  const {
    requestPasswordReset,
    verifyPasswordResetOtp,
    resetPassword,
  } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      if (step === "email") {
        await requestPasswordReset(email);
        setStep("otp");
        setMessage("If an account exists for this email, a reset code has been sent.");
      } else if (step === "otp") {
        await verifyPasswordResetOtp(email, otp);
        setStep("password");
        setMessage("Code verified. Choose a new password.");
      } else {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        await resetPassword(email, otp, password);
        setLocation("/sign-in");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Password reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-card p-8 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === "email"
              ? "Enter your account email and we will send a one-time code."
              : step === "otp"
                ? "Enter the one-time code from your email."
                : "Create a new password for your account."}
          </p>
        </div>
        {step === "email" && (
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
        )}
        {step === "otp" && (
          <div className="space-y-2">
            <Label htmlFor="reset-otp">Verification code</Label>
            <Input id="reset-otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} />
          </div>
        )}
        {step === "password" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New password</Label>
              <Input id="reset-password" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-reset-password">Confirm new password</Label>
              <Input id="confirm-reset-password" type="password" minLength={8} required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>
          </div>
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Please wait..." : step === "email" ? "Send reset code" : step === "otp" ? "Verify code" : "Set new password"}
        </Button>
        <button type="button" className="w-full text-sm text-primary" onClick={() => setLocation("/sign-in")}>
          Back to sign in
        </button>
      </form>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-[100dvh] items-center justify-center">Loading...</div>;
  if (!user) return <Redirect to="/sign-in" />;
  return <Shell><Component /></Shell>;
}

function Routes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-[100dvh] items-center justify-center">Loading...</div>;
  return (
    <Switch>
      <Route path="/sign-in"><>{user ? <Redirect to="/workspaces" /> : <AuthPage mode="sign-in" />}</></Route>
      <Route path="/sign-up"><>{user ? <Redirect to="/workspaces" /> : <AuthPage mode="sign-up" />}</></Route>
      <Route path="/forgot-password"><>{user ? <Redirect to="/workspaces" /> : <ForgotPasswordPage />}</></Route>
      <Route path="/"><>{user ? <Redirect to="/workspaces" /> : <Landing />}</></Route>
      <Route path="/workspaces"><>{user ? <Workspaces /> : <Redirect to="/sign-in" />}</></Route>
      <Route path="/workspaces/:workspaceId">{() => <ProtectedRoute component={WorkspaceDashboard} />}</Route>
      <Route path="/workspaces/:workspaceId/projects">{() => <ProtectedRoute component={WorkspaceProjects} />}</Route>
      <Route path="/workspaces/:workspaceId/projects/:projectId">{() => <ProtectedRoute component={ProjectBoard} />}</Route>
      <Route path="/workspaces/:workspaceId/members">{() => <ProtectedRoute component={Members} />}</Route>
      <Route path="/workspaces/:workspaceId/study-hub">{() => <ProtectedRoute component={StudyHub} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider><Routes /><Toaster /></TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </WouterRouter>
  );
}

export default App;
