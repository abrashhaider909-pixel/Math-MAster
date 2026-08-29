import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

type AnyObject = Record<string, any>;

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "";
let supabase: any = null;
let useSupabase = false;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  useSupabase = true;
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function ensureLocalDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      admin: {
        username: process.env.ADMIN_USERNAME || "abrash",
        password: process.env.ADMIN_PASSWORD || "123oPm78",
        name: process.env.ADMIN_NAME || "Abrash (Educator Admin)",
      },
      students: [],
      attempts: [],
      mistakes: [],
      questStages: [],
      badges: [],
      lastUpdated: Date.now(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
  }
}

async function readLocalDb() {
  ensureLocalDb();
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(raw);
}

async function writeLocalDb(db: AnyObject) {
  ensureLocalDb();
  db.lastUpdated = Date.now();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export async function getMode() {
  return useSupabase ? "supabase" : "local";
}

// Students
export async function getStudents() {
  if (useSupabase) {
    const { data, error } = await supabase.from("students").select("data");
    if (error) throw error;
    return data.map((r: any) => r.data);
  }
  const db = await readLocalDb();
  return db.students || [];
}

export async function createStudent(student: AnyObject) {
  if (useSupabase) {
    const { error } = await supabase
      .from("students")
      .insert([{ id: student.id, username: student.username, data: student }]);
    if (error) throw error;
    return student;
  }
  const db = await readLocalDb();
  db.students = db.students || [];
  db.students.push(student);
  await writeLocalDb(db);
  return student;
}

export async function updateStudent(id: string, student: AnyObject) {
  if (useSupabase) {
    const { error } = await supabase
      .from("students")
      .update({ data: student, username: student.username })
      .eq("id", id);
    if (error) throw error;
    return student;
  }
  const db = await readLocalDb();
  db.students = db.students || [];
  const idx = db.students.findIndex((s: any) => s.id === id);
  if (idx !== -1) db.students[idx] = { ...db.students[idx], ...student };
  await writeLocalDb(db);
  return db.students[idx];
}

export async function deleteStudent(id: string) {
  if (useSupabase) {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
  const db = await readLocalDb();
  db.students = (db.students || []).filter((s: any) => s.id !== id);
  db.attempts = (db.attempts || []).filter((a: any) => a.studentId !== id);
  db.mistakes = (db.mistakes || []).filter((m: any) => m.studentId !== id);
  await writeLocalDb(db);
  return true;
}

// Attempts
export async function getAttempts(studentId?: string) {
  if (useSupabase) {
    const { data, error } = await supabase.from("attempts").select("data");
    if (error) throw error;
    const attempts = data.map((r: any) => r.data);
    return studentId
      ? attempts.filter((a: any) => a.studentId === studentId)
      : attempts;
  }
  const db = await readLocalDb();
  const attempts = db.attempts || [];
  return studentId
    ? attempts.filter((a: any) => a.studentId === studentId)
    : attempts;
}

export async function createAttempt(attempt: AnyObject) {
  if (useSupabase) {
    const { error } = await supabase.from("attempts").insert([
      {
        id: attempt.id,
        studentId: attempt.studentId,
        data: attempt,
        timestamp: attempt.timestamp,
      },
    ]);
    if (error) throw error;
    return attempt;
  }
  const db = await readLocalDb();
  db.attempts = db.attempts || [];
  db.attempts.push(attempt);
  await writeLocalDb(db);
  return attempt;
}

// Mistakes
export async function getMistakes(studentId?: string) {
  if (useSupabase) {
    const { data, error } = await supabase.from("mistakes").select("data");
    if (error) throw error;
    const mistakes = data.map((r: any) => r.data);
    return studentId
      ? mistakes.filter((m: any) => m.studentId === studentId)
      : mistakes;
  }
  const db = await readLocalDb();
  const mistakes = db.mistakes || [];
  return studentId
    ? mistakes.filter((m: any) => m.studentId === studentId)
    : mistakes;
}

export async function saveMistakes(mistakes: AnyObject[]) {
  if (useSupabase) {
    for (const m of mistakes) {
      const { error } = await supabase.from("mistakes").upsert({
        id: m.id,
        studentId: m.studentId || null,
        data: m,
        timestamp: m.timestamp || new Date().toISOString(),
      });
      if (error) console.error("Supabase saveMistake error", error);
    }
    return true;
  }
  const db = await readLocalDb();
  db.mistakes = db.mistakes || [];
  for (const m of mistakes) {
    const idx = db.mistakes.findIndex((x: any) => x.id === m.id);
    if (idx !== -1) db.mistakes[idx] = m;
    else db.mistakes.push(m);
  }
  await writeLocalDb(db);
  return true;
}

export async function resetDatabase() {
  if (useSupabase) {
    try {
      // Delete rows
      await supabase.from("attempts").delete().neq("id", "");
      await supabase.from("mistakes").delete().neq("id", "");
      await supabase.from("students").delete().neq("id", "");
      // Recreate admin
      await supabase.from("admin").upsert([
        {
          id: 1,
          username: process.env.ADMIN_USERNAME || "abrash",
          password: process.env.ADMIN_PASSWORD || "123oPm78",
          name: process.env.ADMIN_NAME || "Abrash (Educator Admin)",
        },
      ]);
      return true;
    } catch (e) {
      console.error("Supabase reset error", e);
      return false;
    }
  }
  const db = {
    admin: {
      username: process.env.ADMIN_USERNAME || "abrash",
      password: process.env.ADMIN_PASSWORD || "123oPm78",
      name: process.env.ADMIN_NAME || "Abrash (Educator Admin)",
    },
    students: [],
    attempts: [],
    mistakes: [],
    questStages: [],
    badges: [],
    lastUpdated: Date.now(),
  };
  await writeLocalDb(db);
  return true;
}

export async function resetStudentDailyTest(studentId: string) {
  if (useSupabase) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { error } = await supabase
        .from("attempts")
        .delete()
        .eq("student_id", studentId)
        .gte("timestamp", today.toISOString())
        .lt("timestamp", tomorrow.toISOString());
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("resetStudentDailyTest error", e);
      return false;
    }
  }
  const db = await readLocalDb();
  db.attempts = (db.attempts || []).filter((a: any) => {
    if (a.studentId !== studentId) return true;
    const d = new Date(a.timestamp);
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    const today2 = new Date();
    return !(
      y === today2.getFullYear() &&
      m === today2.getMonth() &&
      day === today2.getDate()
    );
  });
  await writeLocalDb(db);
  return true;
}

// Quest stages & badges
export async function getQuestStages() {
  if (useSupabase) {
    const { data, error } = await supabase.from("quest_stages").select("data");
    if (error) throw error;
    return data.map((r: any) => r.data);
  }
  const db = await readLocalDb();
  return db.questStages || [];
}

export async function getBadges() {
  if (useSupabase) {
    const { data, error } = await supabase.from("badges").select("data");
    if (error) throw error;
    return data.map((r: any) => r.data);
  }
  const db = await readLocalDb();
  return db.badges || [];
}

export async function getCounts() {
  if (useSupabase) {
    const { count: s } = await supabase
      .from("students")
      .select("*", { count: "exact" });
    const { count: a } = await supabase
      .from("attempts")
      .select("*", { count: "exact" });
    return { studentsCount: s || 0, attemptsCount: a || 0 };
  }
  const db = await readLocalDb();
  return {
    studentsCount: (db.students || []).length,
    attemptsCount: (db.attempts || []).length,
  };
}

export async function getLastUpdated() {
  if (useSupabase) {
    try {
      // Check updated_at across key tables and return the most recent timestamp
      const tables = [
        "students",
        "attempts",
        "mistakes",
        "badges",
        "quest_stages",
      ];
      let maxTs = 0;
      for (const t of tables) {
        const { data, error } = await supabase
          .from(t)
          .select("updated_at")
          .order("updated_at", { ascending: false })
          .limit(1);
        if (error) {
          // ignore per-table errors
          continue;
        }
        if (Array.isArray(data) && data.length > 0) {
          const val = data[0].updated_at || data[0].timestamp || null;
          if (val) {
            const ts = new Date(val).getTime();
            if (!isNaN(ts) && ts > maxTs) maxTs = ts;
          }
        }
      }
      return maxTs || Date.now();
    } catch (e) {
      return Date.now();
    }
  }
  const db = await readLocalDb();
  return db.lastUpdated || Date.now();
}

export { useSupabase };
