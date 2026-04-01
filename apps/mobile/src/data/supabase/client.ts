import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

type RequiredEnvName = "EXPO_PUBLIC_SUPABASE_URL" | "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

function getExpoExtraEnv(name: RequiredEnvName): string | undefined {
  const value = Constants.expoConfig?.extra?.[name];

  return typeof value === "string" ? value : undefined;
}

function getRequiredEnv(name: RequiredEnvName): string {
  const value = process.env[name] ?? getExpoExtraEnv(name);

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
