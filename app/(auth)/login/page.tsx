"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const callbackError = searchParams.get("error");

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg, #0f1f4a 0%, #162d6d 45%, #1e3a8a 100%)" }}
    >
      <div className="w-full max-w-4xl flex rounded-3xl overflow-hidden shadow-2xl">
        {/* Left panel — branding */}
        <div className="hidden lg:flex lg:w-5/12 flex-col items-center justify-center p-10 text-white"
          style={{ background: "rgba(255,255,255,0.06)", borderRight: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Image
            src="/enc-logo.png"
            alt="Every Nation College"
            width={150}
            height={150}
            className="mb-6 drop-shadow-2xl"
            priority
          />
          <h1 className="text-2xl font-bold text-center leading-snug text-white">
            Every Nation College
          </h1>
          <p className="text-blue-200 text-sm mt-2 text-center tracking-wide">
            Equipping Leaders for Effective Services
          </p>
          <div className="mt-6 w-10 h-0.5 rounded-full" style={{ backgroundColor: "#d97706" }} />
          <p className="mt-6 text-blue-200 text-xs text-center leading-relaxed opacity-80">
            Fee Management System<br />
            Bo, Sierra Leone
          </p>
          <p className="mt-auto pt-8 text-blue-300 text-xs text-center opacity-50">
            © {new Date().getFullYear()} enc.edu.sl
          </p>
        </div>

        {/* Right panel — login form */}
        <div className="flex-1 bg-white flex flex-col items-center justify-center p-8 lg:p-10">
          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center mb-6">
            <Image src="/enc-logo.png" alt="ENC Logo" width={72} height={72} className="mb-3" priority />
            <h1 className="text-lg font-bold text-gray-900">Every Nation College</h1>
            <p className="text-gray-500 text-xs mt-0.5">Fee Management System · Bo, Sierra Leone</p>
          </div>

          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
            <p className="text-gray-500 text-sm mb-7">Access the fee management system</p>

            {(error || callbackError) && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error || "Authentication failed. Please try again."}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@enc.edu.sl"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": "#1e3a8a" } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": "#1e3a8a" } as React.CSSProperties}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white transition-opacity"
                style={{ backgroundColor: "#1e3a8a", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
