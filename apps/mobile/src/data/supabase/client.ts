import { createClient } from "@supabase/supabase-js";

function getRequiredEnv(name: "EXPO_PUBLIC_SUPABASE_URL" | "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"): string {
  const value = process.env[name];

  if (!value && process.env.NODE_ENV === "test") {
    return name === "EXPO_PUBLIC_SUPABASE_URL"
      ? "https://example.supabase.co"
      : "test-publishable-key";
  }

  if (!value) {
    throw new Error(`Missing required Supabase environment variable: ${name}`);
  }

  return value;
}

const supabaseUrl = getRequiredEnv("EXPO_PUBLIC_SUPABASE_URL");
const supabasePublishableKey = getRequiredEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
