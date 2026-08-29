import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getStudents, getMode, useSupabase as _useSupabase } from "./_db.js";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "";
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST")
      return res
        .status(405)
        .json({ success: false, error: "Method not allowed" });
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ success: false, error: "Username and password are required" });

    const cleanUser = String(username).trim().toLowerCase();
    const cleanPass = String(password).trim();

    // Check admin via local db, env, or Supabase admin table
    const mode = await getMode();
    if (mode === "local") {
      // read local db
      const dbRaw = await import("fs")
        .then((fs) => fs.promises.readFile("./data/db.json", "utf-8"))
        .then(JSON.parse)
        .catch(() => ({
          admin: {
            username: process.env.ADMIN_USERNAME || "abrash",
            password: process.env.ADMIN_PASSWORD || "123oPm78",
            name: process.env.ADMIN_NAME || "Abrash (Educator Admin)",
          },
        }));
      const admin = dbRaw.admin || {
        username: process.env.ADMIN_USERNAME || "abrash",
        password: process.env.ADMIN_PASSWORD || "123oPm78",
        name: process.env.ADMIN_NAME || "Abrash (Educator Admin)",
      };
      if (
        (cleanUser === admin.username.toLowerCase() || cleanUser === "admin") &&
        cleanPass === admin.password
      ) {
        return res.status(200).json({
          success: true,
          role: "admin",
          user: { username: admin.username, name: admin.name },
        });
      }
    }

    // If Supabase is configured, check admin table there
    if (_useSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from("admin")
          .select("username, password, name")
          .eq("username", cleanUser)
          .limit(1);
        if (!error && Array.isArray(data) && data.length > 0) {
          const a = data[0];
          if (a.password === cleanPass) {
            return res.status(200).json({
              success: true,
              role: "admin",
              user: { username: a.username, name: a.name },
            });
          }
        }
      } catch (e) {
        // continue to env fallback
      }
    }

    // Env fallback (useful for production when admin stored as env vars)
    if (
      (cleanUser === (process.env.ADMIN_USERNAME || "abrash").toLowerCase() ||
        cleanUser === "admin") &&
      cleanPass === (process.env.ADMIN_PASSWORD || "123oPm78")
    ) {
      return res.status(200).json({
        success: true,
        role: "admin",
        user: {
          username: process.env.ADMIN_USERNAME || "abrash",
          name: process.env.ADMIN_NAME || "Abrash (Educator Admin)",
        },
      });
    }

    // Check students
    const students = await getStudents();
    const student = students.find(
      (s: any) =>
        s.username.toLowerCase() === cleanUser &&
        String(s.password).trim() === cleanPass,
    );
    if (student)
      return res.status(200).json({ success: true, role: "student", student });

    return res
      .status(401)
      .json({ success: false, error: "Invalid username or password." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: (e as Error).message });
  }
}
