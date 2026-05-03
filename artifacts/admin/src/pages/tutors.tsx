import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Profile } from "@/lib/api";
import { GraduationCap, CheckCircle, XCircle, User } from "lucide-react";

function ProfileAvatar({ profile }: { profile: Profile }) {
  if (profile.avatarUrl) {
    return <img src={profile.avatarUrl} alt={profile.displayName} className="w-9 h-9 rounded-full object-cover" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
      <span className="text-sm font-bold text-primary">{profile.displayName[0]?.toUpperCase() ?? "?"}</span>
    </div>
  );
}

export default function TutorsPage() {
  const qc = useQueryClient();
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: api.listProfiles,
  });

  const verify = useMutation({
    mutationFn: api.verifyTutor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-profiles"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); },
  });

  const tutors = profiles.filter((p) => p.tutorVerified);
  const students = profiles.filter((p) => !p.tutorVerified);

  const Section = ({ title, items }: { title: string; items: Profile[] }) => (
    <div>
      <h2 className="font-semibold text-foreground mb-3">{title} <span className="text-muted-foreground font-normal">({items.length})</span></h2>
      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">None yet</div>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <ProfileAvatar profile={p} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-foreground text-sm truncate">{p.displayName}</p>
                  {p.tutorVerified ? (
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">@{p.username} · {p.track.replace(/_/g, " ")} · {p.xpBalance.toLocaleString()} XP</p>
                {p.school && <p className="text-xs text-muted-foreground">{p.school}</p>}
              </div>
              <button
                onClick={() => verify.mutate(p.id)}
                disabled={verify.isPending}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  p.tutorVerified
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25"
                }`}
              >
                {p.tutorVerified ? (
                  <><XCircle className="w-3.5 h-3.5" /> Revoke</>
                ) : (
                  <><CheckCircle className="w-3.5 h-3.5" /> Verify</>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tutor Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Verified tutors can access the admin panel and create bootcamps
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : (
        <>
          <Section title="Verified Tutors" items={tutors} />
          <Section title="Students" items={students} />
        </>
      )}
    </div>
  );
}
