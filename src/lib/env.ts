// Runtime env validation. Imported lazily so build-time doesn't fail on dev.
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_NAME: z.string().default("HAJR A°"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(["ar", "en"]).default("ar"),
  VIDEO_PROVIDER: z.enum(["zoom", "daily"]).default("zoom"),
});

let cached: z.infer<typeof schema> | null = null;
export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.warn("[env] Missing or invalid environment variables:", parsed.error.flatten().fieldErrors);
  }
  cached = (parsed.success ? parsed.data : (process.env as any)) as z.infer<typeof schema>;
  return cached;
}
