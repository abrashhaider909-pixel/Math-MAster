import {
  StudentAccount,
  DodgingTestAttempt,
  LeaderboardEntry,
  MistakeRecord,
  AuthState,
} from '../types';

export interface LoginResponse {
  success: boolean;
  role?: 'admin' | 'student';
  student?: StudentAccount;
  user?: { username: string; name: string };
  error?: string;
}

export const ApiService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      return await res.json();
    } catch (err: any) {
      console.error('API login error:', err);
      return { success: false, error: 'Failed to connect to backend server. Please check your network.' };
    }
  },

  async getStudents(): Promise<StudentAccount[]> {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      return data.students || [];
    } catch (err) {
      console.error('API getStudents error:', err);
      return [];
    }
  },

  async createStudent(studentData: Partial<StudentAccount>): Promise<{ success: boolean; student?: StudentAccount; error?: string }> {
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
      return await res.json();
    } catch (err: any) {
      console.error('API createStudent error:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  },

  async updateStudent(id: string, update: Partial<StudentAccount>): Promise<{ success: boolean; student?: StudentAccount; error?: string }> {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      return await res.json();
    } catch (err: any) {
      console.error('API updateStudent error:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  },

  async deleteStudent(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      const data = await res.json();
      return !!data.success;
    } catch (err) {
      console.error('API deleteStudent error:', err);
      return false;
    }
  },

  async resetStudentDailyTest(studentId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/students/${studentId}/reset-daily`, { method: 'POST' });
      const data = await res.json();
      return !!data.success;
    } catch (err) {
      console.error('API resetStudentDailyTest error:', err);
      return false;
    }
  },

  async submitAttempt(attempt: DodgingTestAttempt): Promise<{ success: boolean; attempt?: DodgingTestAttempt; student?: StudentAccount }> {
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt),
      });
      return await res.json();
    } catch (err) {
      console.error('API submitAttempt error:', err);
      return { success: false };
    }
  },

  async getAttempts(studentId?: string): Promise<DodgingTestAttempt[]> {
    try {
      const url = studentId ? `/api/attempts?studentId=${encodeURIComponent(studentId)}` : '/api/attempts';
      const res = await fetch(url);
      const data = await res.json();
      return data.attempts || [];
    } catch (err) {
      console.error('API getAttempts error:', err);
      return [];
    }
  },

  async getLeaderboard(classCode?: string): Promise<LeaderboardEntry[]> {
    try {
      const url = classCode && classCode !== 'all' ? `/api/leaderboard?classCode=${encodeURIComponent(classCode)}` : '/api/leaderboard';
      const res = await fetch(url);
      const data = await res.json();
      return data.leaderboard || [];
    } catch (err) {
      console.error('API getLeaderboard error:', err);
      return [];
    }
  },

  async getMistakes(studentId?: string): Promise<MistakeRecord[]> {
    try {
      const url = studentId ? `/api/mistakes?studentId=${encodeURIComponent(studentId)}` : '/api/mistakes';
      const res = await fetch(url);
      const data = await res.json();
      return data.mistakes || [];
    } catch (err) {
      console.error('API getMistakes error:', err);
      return [];
    }
  },

  async saveMistakes(mistakes: MistakeRecord[]): Promise<boolean> {
    try {
      const res = await fetch('/api/mistakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mistakes }),
      });
      const data = await res.json();
      return !!data.success;
    } catch (err) {
      console.error('API saveMistakes error:', err);
      return false;
    }
  },

  async resetMasterDatabase(): Promise<boolean> {
    try {
      const res = await fetch('/api/admin/reset-database', { method: 'POST' });
      const data = await res.json();
      return !!data.success;
    } catch (err) {
      console.error('API resetMasterDatabase error:', err);
      return false;
    }
  },

  // Setup Real-Time Live Sync Listener via SSE
  subscribeToUpdates(onUpdate: (data: any) => void): () => void {
    try {
      const eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onUpdate(parsed);
        } catch {
          // ignore
        }
      };
      eventSource.onerror = () => {
        // EventSource will automatically retry connection
      };
      return () => {
        eventSource.close();
      };
    } catch (e) {
      console.warn('SSE subscription not supported, falling back to polling.');
      return () => {};
    }
  },
};
