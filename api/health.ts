import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getCounts,
  getMode,
  getSupabaseInitDiagnostic,
  testSupabaseConnection,
} from "./_db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const mode = await getMode();
    const counts = await getCounts().catch((e) => ({
      studentsCount: 0,
      attemptsCount: 0,
    }));
    const isProduction =
      process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

    const supDiag = getSupabaseInitDiagnostic();
    // perform an actual lightweight Supabase REST fetch diagnostic to validate connectivity
    let supTest: any = null;
    if (supDiag.hasSupabaseEnv) {
      supTest = await testSupabaseConnection().catch((e) => ({
        ok: false,
        result: { errorMessage: (e as Error).message },
      }));
    }

    // If envs exist but the test fails in production, return a safe error for diagnosis
    if (isProduction && supDiag.hasSupabaseEnv && supTest && !supTest.ok) {
      return res.status(502).json({
        status: "error",
        mode,
        isProduction,
        hasSupabaseEnv: supDiag.hasSupabaseEnv,
        supabaseInitOk: supDiag.supabaseInitOk,
        supabaseFetch: supTest.result || null,
      });
    }

    // Success path
    res.status(200).json({
      status: "ok",
      mode,
      isProduction,
      hasSupabaseEnv: supDiag.hasSupabaseEnv,
      supabaseInitOk: supDiag.supabaseInitOk,
      supabaseError: supDiag.supabaseInitError || null,
      ...counts,
    });
  } catch (e) {
    res.status(500).json({ status: "error", error: (e as Error).message });
  }
}
