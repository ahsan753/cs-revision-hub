import { FormEvent, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAuth } from "../auth/useAuth";

export function LoginPage() {
  const { configured, signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await signIn(email, password);
      navigate("/account");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthSurface
      title="Sign in"
      description="Use your school account to record ranked XP and join leaderboards."
    >
      {!configured ? <SupabaseSetupNotice /> : null}
      <form className="space-y-4" onSubmit={submit}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        {message ? <p className="text-sm font-bold text-rose-600">{message}</p> : null}
        <Button disabled={!configured || busy || !email || !password}>
          {busy ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
        <Link className="text-primary hover:underline" to="/signup">
          Create account
        </Link>
        <button
          className="text-muted hover:text-primary"
          disabled={!configured || !email}
          onClick={async () => {
            try {
              await resetPassword(email);
              setMessage("Password reset email sent.");
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Password reset email could not be sent.",
              );
            }
          }}
          type="button"
        >
          Reset password
        </button>
      </div>
    </AuthSurface>
  );
}

export function SignupPage() {
  const { configured, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await signUp(email, password);
      setMessage("Check your school email to verify your account.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Signup failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthSurface
      title="Create account"
      description="Ranked XP starts from zero and only online verified answers count."
    >
      {!configured ? <SupabaseSetupNotice /> : null}
      <form className="space-y-4" onSubmit={submit}>
        <TextField
          label="School email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          placeholder="name@student.orbital.education"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        {message ? <p className="text-sm font-bold text-primary">{message}</p> : null}
        <Button disabled={!configured || busy || !email || password.length < 8}>
          {busy ? "Creating..." : "Create account"}
        </Button>
      </form>
      <p className="mt-5 text-sm font-bold text-muted">
        Already have an account?{" "}
        <Link className="text-primary hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </AuthSurface>
  );
}

export function SupabaseSetupNotice() {
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
      Supabase is not configured yet. Add VITE_SUPABASE_URL and
      VITE_SUPABASE_PUBLISHABLE_KEY to enable accounts.
    </div>
  );
}

function AuthSurface({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-line bg-white p-6 shadow-soft">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mt-2 text-sm font-bold text-muted">{description}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type,
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-muted">{label}</span>
      <input
        className="mt-2 min-h-11 w-full rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
    </label>
  );
}
