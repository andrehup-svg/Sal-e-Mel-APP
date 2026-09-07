"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  async function entrarComGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Sal e Mel</h1>
      <button
        onClick={entrarComGoogle}
        className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
      >
        Entrar com Google
      </button>
    </div>
  );
}
