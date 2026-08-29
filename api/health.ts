import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCounts, getMode } from "./_db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const mode = await getMode();
    const counts = await getCounts().catch((e) => ({
      studentsCount: 0,
      attemptsCount: 0,
    }));
    const hasSupabaseEnv = Boolean(
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY,
    );
    const isProduction =
      process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    res.status(200).json({
      status: "ok",
      mode,
      isProduction,
      hasSupabaseEnv,
      ...counts,
    });
  } catch (e) {
    res.status(500).json({ status: "error", error: (e as Error).message });
  }
}
