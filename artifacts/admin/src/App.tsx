import { useState, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LayoutDashboard, BookOpen, GraduationCap, LogOut, Menu, X } from "lucide-react";
import { api, getToken, clearToken, type Profile, type AdminBootcamp } from "@/lib/api";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import BootcampsPage from "@/pages/bootcamps";
import BootcampDetailPage from "@/pages/bootcamp-detail";
import TutorsPage from "@/pages/tutors";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

type Page = "dashboard" | "bootcamps" | "tutors";

const NAV_ITEMS = [
  { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
  { id: "bootcamps" as Page, label: "Bootcamps", icon: BookOpen },
  { id: "tutors" as Page, label: "Tutors", icon: GraduationCap },
];

function AdminShell() {
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedBootcamp, setSelectedBootcamp] = useState<AdminBootcamp | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.me().then((p) => {
      setProfile(p);
      setAuthed(true);
    }).catch(() => clearToken());
  }, []);

  const handleLogin = useCallback(async () => {
    const p = await api.me();
    setProfile(p);
    setAuthed(true);
  }, []);

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    setProfile(null);
    queryClient.clear();
  };

  if (!authed) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const handleSelectBootcamp = (b: AdminBootcamp) => {
    setSelectedBootcamp(b);
  };

  const handleBack = () => {
    setSelectedBootcamp(null);
  };

  const navigate = (p: Page) => {
    setPage(p);
    setSelectedBootcamp(null);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-60 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-black text-primary">Z</span>
            </div>
            <div>
              <p className="text-sm font-bold text-sidebar-foreground">Zero Club</p>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                page === id
                  ? "bg-primary/15 text-primary"
                  : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          {profile && (
            <div className="flex items-center gap-2.5 px-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{profile.displayName[0]?.toUpperCase() ?? "?"}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">{profile.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-foreground text-sm">Zero Club Admin</span>
        </header>

        <main className="flex-1 p-5 lg:p-7 max-w-5xl mx-auto w-full">
          {page === "dashboard" && <DashboardPage />}
          {page === "bootcamps" && !selectedBootcamp && (
            <BootcampsPage onSelectBootcamp={handleSelectBootcamp} />
          )}
          {page === "bootcamps" && selectedBootcamp && (
            <BootcampDetailPage bootcamp={selectedBootcamp} onBack={handleBack} />
          )}
          {page === "tutors" && <TutorsPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminShell />
    </QueryClientProvider>
  );
}
