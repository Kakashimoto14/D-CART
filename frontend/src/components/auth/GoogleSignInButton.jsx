import { useEffect, useRef, useState } from "react";
import { authApi } from "../../api/authApi";

const GOOGLE_SCRIPT_ID = "google-identity-services";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const loadGoogleIdentityScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Google Identity Services.")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Unable to load Google Identity Services."));
    document.head.appendChild(script);
  });

export function GoogleSignInButton({ onSuccess, onError, text = "signin_with" }) {
  const containerRef = useRef(null);
  const successRef = useRef(onSuccess);
  const errorRef = useRef(onError);
  const [isReady, setIsReady] = useState(false);
  const [helperMessage, setHelperMessage] = useState("");

  useEffect(() => {
    successRef.current = onSuccess;
    errorRef.current = onError;
  }, [onError, onSuccess]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setHelperMessage("Google sign-in is hidden until VITE_GOOGLE_CLIENT_ID is configured.");
      return;
    }

    let isMounted = true;

    loadGoogleIdentityScript()
      .then((google) => {
        if (!isMounted || !containerRef.current) {
          return;
        }

        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            try {
              const response = await authApi.googleLogin({ credential });
              successRef.current(response);
            } catch (error) {
              errorRef.current(error);
            }
          }
        });

        containerRef.current.innerHTML = "";
        google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width: containerRef.current.offsetWidth || 320,
          text,
          shape: "rectangular",
          logo_alignment: "left"
        });

        setIsReady(true);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setHelperMessage(error.message || "Google sign-in is unavailable right now.");
      });

    return () => {
      isMounted = false;
    };
  }, [text]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={`min-h-11 rounded-lg ${isReady ? "" : "bg-slate-100"}`}
        aria-live="polite"
      />
      {helperMessage ? <p className="text-xs text-slate-500">{helperMessage}</p> : null}
    </div>
  );
}
