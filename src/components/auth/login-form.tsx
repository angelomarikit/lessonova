"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Supabase is not configured yet. Add your environment variables to enable login.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) {
        setError(oauthError.message);
      }
    } catch {
      setError("Supabase is not configured yet. Add your environment variables to enable Google sign-in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
          autoComplete="email"
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClassName}
          autoComplete="current-password"
        />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="cursor-pointer text-sm font-medium text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
        {loading ? "Signing in..." : "Log In"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="h-12 w-full text-base"
        disabled={loading}
        onClick={signInWithGoogle}
      >
        Continue with Google
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-xl border border-border bg-white px-4 py-3.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
