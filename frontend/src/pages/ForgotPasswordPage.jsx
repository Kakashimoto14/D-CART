import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/authApi";
import { BrandLogo } from "../components/brand/BrandLogo.jsx";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [debugResetUrl, setDebugResetUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setDebugResetUrl("");
    setIsSubmitting(true);

    try {
      const response = await authApi.forgotPassword({ email });
      setMessage(response.message);
      setDebugResetUrl(response.debugResetUrl || "");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to process password reset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="panel px-6 py-8 sm:px-8">
          <div className="mb-8 space-y-5">
            <BrandLogo className="h-12 w-auto" imageClassName="h-12 w-auto" />
            <p className="brand-kicker">Password recovery</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Reset your password</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter your account email and we&apos;ll send a secure reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
              required
            />
            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
            {message ? <p className="text-sm font-medium text-emerald-600">{message}</p> : null}
            {debugResetUrl ? (
              <p className="text-xs text-slate-500">
                Development reset link:{" "}
                <a href={debugResetUrl} className="font-semibold text-brand-600">
                  open reset page
                </a>
              </p>
            ) : null}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            Back to{" "}
            <Link to="/login" className="font-semibold text-brand-600">
              sign in
            </Link>
          </p>
        </section>

        <section className="panel hidden overflow-hidden lg:block">
          <div className="flex h-full flex-col justify-between bg-[linear-gradient(135deg,#fff6ee_0%,#ffffff_52%,#ffe7db_100%)] px-10 py-12">
            <div>
              <p className="brand-kicker">Secure recovery</p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight text-ink">
                One secure link, one quick password reset.
              </h1>
            </div>
            <p className="max-w-md text-sm leading-7 text-slate-600">
              Reset links expire automatically so accounts stay protected even when emails are delayed.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
