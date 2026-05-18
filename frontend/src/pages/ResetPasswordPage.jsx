import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useMemo(() => new URLSearchParams(location.search).get("token") || "", [location.search]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("This reset link is missing a token. Please request a new one.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authApi.resetPassword({ token, password });
      setMessage(response.message);
      setTimeout(() => navigate("/login"), 1200);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="panel px-6 py-8 sm:px-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">
              Create a new password
            </p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Choose something secure</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
              minLength={8}
              required
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="field"
              minLength={8}
              required
            />
            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
            {message ? <p className="text-sm font-medium text-emerald-600">{message}</p> : null}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? "Updating..." : "Update password"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            Return to{" "}
            <Link to="/login" className="font-semibold text-brand-700">
              sign in
            </Link>
          </p>
        </section>

        <section className="panel hidden overflow-hidden lg:block">
          <div className="flex h-full flex-col justify-between bg-mesh-soft px-10 py-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
                Account safety
              </p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight text-ink">
                Reset securely and get back to ordering fast.
              </h1>
            </div>
            <p className="max-w-md text-sm leading-7 text-slate-600">
              Use at least eight characters and avoid reusing an old password from another service.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
