"use client";

import { useState, useEffect, Suspense } from "react";
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
  const [setupDone, setSetupDone] = useState<null | boolean>(null);
  const [setupMsg, setSetupMsg] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setSetupDone(!d.error))
      .catch(() => setSetupDone(false));
  }, []);

  const handleSetup = async () => {
    setLoading(true);
    const res = await fetch("/api/seed", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setSetupMsg(`Admin created — Email: ${data.email}  Password: ${data.defaultPassword}`);
      setSetupDone(true);
    } else {
      setSetupMsg(data.error);
    }
    setLoading(false);
  };

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
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white"
        style={{ background: "linear-gradient(160deg, #162d6d 0%, #1e3a8a 60%, #1e40af 100%)" }}
      >
        <Image
          src="/enc-logo.png"
          alt="Every Nation College Logo"
          width={180}
          height={180}
          className="mb-8 drop-shadow-xl"
          priority
        />
        <h1 className="text-3xl font-bold text-center leading-tight">
          Every Nation College
        </h1>
        <p className="text-blue-200 text-sm mt-2 tracking-wide text-center">
          Equipping Leaders for Effective Services
        </p>
        <div className="mt-8 px-6 py-4 bg-white bg-opacity-10 rounded-2xl text-center max-w-xs">
          <p className="text-white text-sm font-medium">Fee Management System</p>
          <p className="text-blue-200 text-xs mt-1">Bo, Sierra Leone</p>
        </div>
        <div className="mt-auto pt-8 text-blue-300 text-xs text-center opacity-60">
          © {new Date().getFullYear()} Every Nation College · enc.edu.sl
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center mb-8">
            <Image src="/enc-logo.png" alt="ENC Logo" width={80} height={80} className="mb-3" priority />
            <h1 className="text-xl font-bold text-gray-900">Every Nation College</h1>
            <p className="text-gray-500 text-xs mt-0.5">Fee Management System</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
            <p className="text-gray-500 text-sm mb-6">Access the fee management system</p>

            {(error || callbackError) && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error || "Authentication failed. Please try again."}
              </div>
            )}

            {setupMsg && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 font-mono">
                {setupMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@enc.edu.sl"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white transition-colors"
                style={{ backgroundColor: loading ? "#93c5fd" : "#1e3a8a" }}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {setupDone === false && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3">First time? Initialise the admin account:</p>
                <button
                  onClick={handleSetup}
                  disabled={loading}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  Initialise Admin Account
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            Every Nation College · Bo, Sierra Leone
          </p>
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
