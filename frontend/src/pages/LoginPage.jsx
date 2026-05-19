import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { BrandLogo } from "../components/brand/BrandLogo.jsx";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectByRole = (user) => {
    if (user.role === "ADMIN") return "/admin";
    if (user.role === "STAFF") return "/picker";
    return "/home";
  };

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await authApi.login(form);
      login(response);
      navigate(redirectByRole(response.user));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = (response) => {
    setError("");
    login(response);
    navigate(redirectByRole(response.user));
  };

  const handleGoogleError = (requestError) => {
    setError(requestError.response?.data?.message || "Unable to continue with Google.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="panel hidden overflow-hidden lg:block">
          <div className="flex h-full flex-col justify-between bg-[linear-gradient(135deg,#0d1b2a_0%,#2b3137_100%)] px-10 py-12 text-white">
            <div>
              <BrandLogo className="h-14 w-52 rounded-2xl bg-white px-3 py-2 shadow-sm" imageClassName="h-10" />
              <h1 className="mt-4 max-w-lg text-4xl font-extrabold leading-tight text-white">
                Groceries you love, delivered to you.
              </h1>
            </div>
            <p className="max-w-md text-sm leading-7 text-slate-200">
              D&apos;Cart keeps ordering simple for customers and operationally clear for the
              Decolores team handling stock, fulfillment, and same-day delivery.
            </p>
          </div>
        </section>

        <section className="panel px-6 py-8 sm:px-8">
          <div className="mb-8">
            <BrandLogo className="mb-5 h-12 w-44" imageClassName="h-10" />
            <p className="brand-kicker">
              Welcome back
            </p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Sign in to D&apos;Cart</h2>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">Sign in faster with Google</p>
            <p className="mt-1 text-sm text-slate-500">Recommended for customers who want the quickest checkout.</p>
            <div className="mt-4">
              <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
            </div>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or sign in with email</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
              className="field"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="field"
              required
            />
            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-500">
            <Link to="/forgot-password" className="font-semibold text-brand-600">
              Forgot your password?
            </Link>
          </p>

          <p className="mt-6 text-sm text-slate-500">
            New customer?{" "}
            <Link to="/register" className="font-semibold text-brand-600">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
