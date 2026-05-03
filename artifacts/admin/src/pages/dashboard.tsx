import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BookOpen, Users, GraduationCap, Layers, TrendingUp } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: api.stats,
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of Zero Club platform</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Bootcamps"
            value={stats.bootcamps}
            icon={<BookOpen className="w-5 h-5 text-indigo-400" />}
            color="bg-indigo-500/15"
          />
          <StatCard
            label="Total Students"
            value={stats.profiles}
            icon={<Users className="w-5 h-5 text-sky-400" />}
            color="bg-sky-500/15"
          />
          <StatCard
            label="Enrollments"
            value={stats.enrollments}
            icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
            color="bg-emerald-500/15"
          />
          <StatCard
            label="Modules"
            value={stats.modules}
            icon={<Layers className="w-5 h-5 text-amber-400" />}
            color="bg-amber-500/15"
          />
          <StatCard
            label="Verified Tutors"
            value={stats.tutors}
            icon={<GraduationCap className="w-5 h-5 text-purple-400" />}
            color="bg-purple-500/15"
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground mb-2">Quick Start</h2>
        <p className="text-sm text-muted-foreground">
          Use the sidebar to manage bootcamps, add modules to each bootcamp, and verify tutors who
          have passed the Zero Club qualification process.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc list-inside">
          <li>Go to <strong className="text-foreground">Bootcamps</strong> to create and manage learning tracks</li>
          <li>Click a bootcamp to add or edit its curriculum modules</li>
          <li>Go to <strong className="text-foreground">Tutors</strong> to verify qualified educators</li>
          <li>Verified tutors get access to this admin panel to manage their own bootcamps</li>
        </ul>
      </div>
    </div>
  );
}
