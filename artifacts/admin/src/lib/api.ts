const API_BASE = "/api";

export function getToken(): string | null {
  return localStorage.getItem("zero_admin_token");
}

export function setToken(token: string) {
  localStorage.setItem("zero_admin_token", token);
}

export function clearToken() {
  localStorage.removeItem("zero_admin_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<Profile>("/auth/me"),

  makeAdmin: (userId: string) =>
    request<Profile>(`/admin/profiles/${userId}/make-admin`, { method: "PUT" }),

  stats: () => request<AdminStats>("/admin/stats"),

  listBootcamps: () => request<AdminBootcamp[]>("/admin/bootcamps"),

  createBootcamp: (data: BootcampFormData) =>
    request<AdminBootcamp>("/admin/bootcamps", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateBootcamp: (id: string, data: Partial<BootcampFormData>) =>
    request<AdminBootcamp>(`/admin/bootcamps/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteBootcamp: (id: string) =>
    request<{ ok: boolean }>(`/admin/bootcamps/${id}`, { method: "DELETE" }),

  createModule: (bootcampId: string, data: ModuleFormData) =>
    request<AdminModule>(`/admin/bootcamps/${bootcampId}/modules`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateModule: (moduleId: string, data: Partial<ModuleFormData>) =>
    request<AdminModule>(`/admin/modules/${moduleId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteModule: (moduleId: string) =>
    request<{ ok: boolean }>(`/admin/modules/${moduleId}`, { method: "DELETE" }),

  listProfiles: () => request<Profile[]>("/admin/profiles"),

  verifyTutor: (userId: string) =>
    request<Profile>(`/admin/profiles/${userId}/verify-tutor`, { method: "PUT" }),
};

export interface Profile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  track: string;
  school: string | null;
  xpBalance: number;
  fundsBalance: number;
  tutorVerified: number;
  createdAt: string;
}

export interface AdminStats {
  bootcamps: number;
  enrollments: number;
  profiles: number;
  tutors: number;
  modules: number;
}

export interface AdminModule {
  id: string;
  bootcampId: string;
  title: string;
  description: string;
  durationMinutes: number;
  xpReward: number;
  orderIndex: number;
}

export interface AdminBootcamp {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  coverUrl: string | null;
  track: string;
  difficulty: string;
  deliveryMedium: string;
  modulesCount: number;
  xpReward: number;
  priceCents: number;
  enrollmentCount: number;
  modules: AdminModule[];
  createdAt: string;
}

export interface BootcampFormData {
  title: string;
  subtitle: string;
  description: string;
  coverUrl?: string;
  track: string;
  difficulty: string;
  deliveryMedium: string;
  xpReward: number;
  priceCents: number;
}

export interface ModuleFormData {
  title: string;
  description: string;
  durationMinutes: number;
  xpReward: number;
  orderIndex?: number;
}
