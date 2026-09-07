"use client";

import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-creme p-6">
      <Image
        src="/sal-e-mel-logo.jpg"
        alt="Sal e Mel"
        width={120}
        height={120}
        className="rounded-[28px] object-cover"
        priority
      />
      <h1 className="font-display text-4xl text-tinta">Sal e Mel</h1>
      <Button onClick={entrarComGoogle} size="lg">
        Entrar com Google
      </Button>
    </div>
  );
}
