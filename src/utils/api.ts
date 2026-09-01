import {
  StudentAccount,
  DodgingTestAttempt,
  LeaderboardEntry,
  MistakeRecord,
  AuthState,
} from "../types";

export interface LoginResponse {
  success: boolean;
  role?: "admin" | "student";
  student?: StudentAccount;
  user?: { username: string; name: string };
  error?: string;
}

// In production, use same-origin serverless functions at `/api`.
// In development, allow overriding via `VITE_API_URL` or default to localhost backend.
const rawApiUrl = import.meta.env.VITE_API_URL || "";
const API_BASE = (() => {
  if (import.meta.env.DEV) {
    if (rawApiUrl && rawApiUrl !== "") return rawApiUrl.replace(/\/$/, "");
    return "http://localhost:3000";
  }
  // Production -> same origin. Use relative paths like `/api/...`.
  return "";
})();

async function safeFetchJson(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let body: any = undefined;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    throw new Error(
      `HTTP ${res.status} ${res.statusText} - ${typeof body === "string" ? body : JSON.stringify(body)}`,
    );
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export const ApiService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const data = await safeFetchJson(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      return data as LoginResponse;
    } catch (err: any) {
      console.error("API login error:", err);
      return {
        success: false,
        error:
          "Failed to connect to backend server. Please check your network.",
      };
    }
  },

  async getStudents(): Promise<StudentAccount[]> {
    try {
      const data: any = await safeFetchJson(`${API_BASE}/api/students`);
      return data.students || [];
    } catch (err) {
      console.error("API getStudents error:", err);
      return [];
    }
  },

  async createStudent(
    studentData: Partial<StudentAccount>,
  ): Promise<{ success: boolean; student?: StudentAccount; error?: string }> {
    try {
      const data = await safeFetchJson(`${API_BASE}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData),
      });
      return data as {
        success: boolean;
        student?: StudentAccount;
        error?: string;
      };
    } catch (err: any) {
      console.error("API createStudent error:", err);
      return { success: false, error: err.message || "Network error" };
    }
  },

  async updateStudent(
    id: string,
    update: Partial<StudentAccount>,
  ): Promise<{ success: boolean; student?: StudentAccount; error?: string }> {
    try {
      const data = await safeFetchJson(`${API_BASE}/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      return data as {
        success: boolean;
        student?: StudentAccount;
        error?: string;
      };
    } catch (err: any) {
      console.error("API updateStudent error:", err);
      return { success: false, error: err.message || "Network error" };
    }
  },

  async deleteStudent(id: string): Promise<boolean> {
    try {
      const data = await safeFetchJson(`${API_BASE}/api/students/${id}`, {
        method: "DELETE",
      });
      return !!data.success;
    } catch (err) {
      console.error("API deleteStudent error:", err);
      return false;
    }
  },

  async resetStudentDailyTest(studentId: string): Promise<boolean> {
    try {
      const data = await safeFetchJson(
        `${API_BASE}/api/students/${studentId}/reset-daily`,
        { method: "POST" },
      );
      return !!data.success;
    } catch (err) {
      console.error("API resetStudentDailyTest error:", err);
      return false;
    }
  },

  async submitAttempt(attempt: DodgingTestAttempt): Promise<{
    success: boolean;
    attempt?: DodgingTestAttempt;
    student?: StudentAccount;
  }> {
    try {
      const data = await safeFetchJson(`${API_BASE}/api/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attempt),
      });
      return data as {
        success: boolean;
        attempt?: DodgingTestAttempt;
        student?: StudentAccount;
      };
    } catch (err) {
      console.error("API submitAttempt error:", err);
      return { success: false };
    }
  },

  async getAttempts(studentId?: string): Promise<DodgingTestAttempt[]> {
    try {
      const url = studentId
        ? `${API_BASE}/api/attempts?studentId=${encodeURIComponent(studentId)}`
        : `${API_BASE}/api/attempts`;
      const data: any = await safeFetchJson(url);
      return data.attempts || [];
    } catch (err) {
      console.error("API getAttempts error:", err);
      return [];
    }
  },

  async getLeaderboard(classCode?: string): Promise<LeaderboardEntry[]> {
    try {
      const url =
        classCode && classCode !== "all"
          ? `${API_BASE}/api/leaderboard?classCode=${encodeURIComponent(classCode)}`
          : `${API_BASE}/api/leaderboard`;
      const data: any = await safeFetchJson(url);
      return data.leaderboard || [];
    } catch (err) {
      console.error("API getLeaderboard error:", err);
      return [];
    }
  },

  async getMistakes(studentId?: string): Promise<MistakeRecord[]> {
    try {
      const url = studentId
        ? `${API_BASE}/api/mistakes?studentId=${encodeURIComponent(studentId)}`
        : `${API_BASE}/api/mistakes`;
      const data: any = await safeFetchJson(url);
      return data.mistakes || [];
    } catch (err) {
      console.error("API getMistakes error:", err);
      return [];
    }
  },

  async saveMistakes(mistakes: MistakeRecord[]): Promise<boolean> {
    try {
      const data: any = await safeFetchJson(`${API_BASE}/api/mistakes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mistakes }),
      });
      return !!data.success;
    } catch (err) {
      console.error("API saveMistakes error:", err);
      return false;
    }
  },

  async resetMasterDatabase(): Promise<boolean> {
    try {
      const data: any = await safeFetchJson(
        `${API_BASE}/api/admin/reset-database`,
        {
          method: "POST",
        },
      );
      return !!data.success;
    } catch (err) {
      console.error("API resetMasterDatabase error:", err);
      return false;
    }
  },

  // Setup Real-Time Live Sync Listener via SSE
  subscribeToUpdates(onUpdate: (data: any) => void): () => void {
    // Try SSE first; if unavailable or broken, fallback to polling `/api/last-updated`
    let pollId: any = null;
    try {
      if (typeof EventSource !== "undefined") {
        const eventSource = new EventSource(`${API_BASE}/api/events`);
        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            onUpdate(parsed);
          } catch {
            // ignore
          }
        };
        eventSource.onerror = () => {
          // Fallback to polling when SSE errors
          tryFallbackToPolling();
        };
        return () => {
          eventSource.close();
          if (pollId) clearInterval(pollId);
        };
      }
    } catch (e) {
      // continue to polling fallback
    }

    // Polling fallback
    function tryFallbackToPolling() {
      if (pollId) return;
      let last = 0;
      pollId = setInterval(async () => {
        try {
          const data: any = await safeFetchJson(`${API_BASE}/api/last-updated`);
          if (data && data.lastUpdated && data.lastUpdated !== last) {
            last = data.lastUpdated;
            onUpdate({ lastUpdated: last });
          }
        } catch (err) {
          // ignore polling errors
        }
      }, 3000);
    }

    tryFallbackToPolling();
    return () => {
      if (pollId) clearInterval(pollId);
    };
  },
};
