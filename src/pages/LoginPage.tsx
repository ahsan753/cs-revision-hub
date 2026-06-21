import { FormEvent, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { authErrorMessage } from "../auth/authMessages";
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
      setMessage(authErrorMessage(error, "Sign in failed."));
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
          label="Username or email"
          type="text"
          value={email}
          onChange={setEmail}
          autoComplete="username"
          placeholder="firstname.lastname"
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
            if (!email.includes("@")) {
              setMessage("Ask your teacher to reset your password.");
              return;
            }
            try {
              await resetPassword(email);
              setMessage("Password reset email sent.");
            } catch (error) {
              setMessage(
                authErrorMessage(error, "Password reset email could not be sent."),
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
      setMessage(
        "Account created. Check your school email, including junk or spam, for the verification link.",
      );
    } catch (error) {
      setMessage(authErrorMessage(error, "Signup failed."));
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
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <label className="block">
      <span className="text-sm font-bold text-muted">{label}</span>
      <span className="relative mt-2 block">
        <input
          className={`min-h-11 w-full rounded-lg border border-line px-3 text-sm font-bold outline-none focus:border-primary ${
            isPassword ? "pr-12" : ""
          }`}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
        {isPassword ? (
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-slate-100 hover:text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
          </button>
        ) : null}
      </span>
    </label>
  );
}
