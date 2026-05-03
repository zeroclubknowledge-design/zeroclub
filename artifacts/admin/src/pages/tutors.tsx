import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type BootcampAlert, type Profile } from "@/lib/api";
import { GraduationCap, Mail, BookOpen, CheckCircle, Clock, User } from "lucide-react";

const DIFF_COLORS: Record<string, string> = {
  beginner: "text-emerald-400 bg-emerald-400/15",
  intermediate: "text-amber-400 bg-amber-400/15",
  advanced: "text-red-400 bg-red-400/15",
};

function TutorCard({ tutor }: { tutor: Profile }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        {tutor.avatarUrl ? (
          <img src={tutor.avatarUrl} alt={tutor.displayName} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-primary">{tutor.displayName[0]?.toUpperCase() ?? "?"}</span>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-foreground text-sm">{tutor.displayName}</p>
          <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        </div>
        <p className="text-xs text-muted-foreground">@{tutor.username} · {tutor.track.replace(/_/g, " ")}</p>
        {tutor.school && <p className="text-xs text-muted-foreground">{tutor.school}</p>}
        <div className="flex items-center gap-1.5 pt-0.5">
          <Mail className="w-3 h-3 text-primary shrink-0" />
          <a href={`mailto:${tutor.email}`} className="text-xs text-primary hover:underline font-medium">{tutor.email}</a>
        </div>
        {tutor.bio && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 pt-0.5">{tutor.bio}</p>
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert, onMarkReviewed, isPending }: { alert: BootcampAlert; onMarkReviewed: () => void; isPending: boolean }) {
  const created = new Date(alert.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40">
        <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-sm font-semibold text-foreground flex-1 truncate">{alert.title}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[alert.difficulty] ?? ""}`}>
            {alert.difficulty}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> {created}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {alert.tutor ? (
          <TutorCard tutor={alert.tutor} />
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-background border border-border text-muted-foreground text-sm">
            <User className="w-4 h-4" /> Tutor account no longer exists
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Reach out to confirm this tutor's expertise for the <strong className="text-foreground">{alert.track.replace(/_/g, " ")}</strong> track.
          </p>
          <button
            onClick={onMarkReviewed}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold transition-colors disabled:opacity-60 shrink-0 ml-3"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {isPending ? "Saving..." : "Mark Reached Out"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TutorsPage() {
  const qc = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["bootcamp-alerts"],
    queryFn: api.listBootcampAlerts,
    refetchInterval: 30000,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: api.listProfiles,
  });

  const markReviewed = useMutation({
    mutationFn: api.markBootcampReviewed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bootcamp-alerts"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const tutors = profiles.filter((p) => p.tutorVerified);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tutor Outreach</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          When tutors publish a bootcamp, they appear here. Reach out via their email to confirm they're ready to teach.
        </p>
      </div>

      <div>
        <h2 className="font-semibold text-foreground mb-3">
          Pending Outreach
          {alerts.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {alerts.length}
            </span>
          )}
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <CheckCircle className="w-9 h-9 text-emerald-400 mx-auto mb-3" />
            <p className="text-foreground font-medium">All caught up</p>
            <p className="text-sm text-muted-foreground mt-1">
              No new bootcamp submissions waiting for review.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onMarkReviewed={() => markReviewed.mutate(alert.id)}
                isPending={markReviewed.isPending && markReviewed.variables === alert.id}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-foreground mb-3">
          Active Tutors <span className="text-muted-foreground font-normal">({tutors.length})</span>
        </h2>
        {tutors.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No tutors have registered yet.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {tutors.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt={p.displayName} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-primary">{p.displayName[0]?.toUpperCase() ?? "?"}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-foreground text-sm truncate">{p.displayName}</p>
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">@{p.username} · {p.track.replace(/_/g, " ")}</p>
                  <a href={`mailto:${p.email}`} className="text-xs text-primary hover:underline">{p.email}</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
