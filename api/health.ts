import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCounts, getMode } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const mode = await getMode();
    const counts = await getCounts();
    res.status(200).json({ status: "ok", mode, ...counts });
  } catch (e) {
    res.status(500).json({ status: "error", error: (e as Error).message });
  }
}
