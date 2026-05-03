import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type AdminBootcamp, type BootcampFormData } from "@/lib/api";
import { TRACKS, DIFFICULTIES, DELIVERY_MEDIUMS, formatPrice } from "@/lib/utils";
import { Plus, Edit2, Trash2, ChevronRight, BookOpen, Users, Layers, Star, Video, Radio, FileText } from "lucide-react";

interface BootcampFormProps {
  initial?: Partial<BootcampFormData>;
  onSave: (data: BootcampFormData) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function BootcampForm({ initial, onSave, onCancel, saving }: BootcampFormProps) {
  const [form, setForm] = useState<BootcampFormData>({
    title: initial?.title ?? "",
    subtitle: initial?.subtitle ?? "",
    description: initial?.description ?? "",
    coverUrl: initial?.coverUrl ?? "",
    track: initial?.track ?? "frontend",
    difficulty: initial?.difficulty ?? "beginner",
    deliveryMedium: initial?.deliveryMedium ?? "video",
    xpReward: initial?.xpReward ?? 100,
    priceCents: initial?.priceCents ?? 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ ...form, priceCents: Math.round(form.priceCents) });
  };

  const set = (key: keyof BootcampFormData, val: string | number) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} required
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Subtitle *</label>
          <input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} required
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Description *</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} required rows={3}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Cover Image URL</label>
          <input type="url" value={form.coverUrl ?? ""} onChange={(e) => set("coverUrl", e.target.value)} placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Track *</label>
          <select value={form.track} onChange={(e) => set("track", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary">
            {TRACKS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Difficulty *</label>
          <select value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary">
            {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Delivery Medium *</label>
          <select value={form.deliveryMedium} onChange={(e) => set("deliveryMedium", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary">
            {DELIVERY_MEDIUMS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">XP Reward</label>
          <input type="number" min={0} value={form.xpReward} onChange={(e) => set("xpReward", Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Price (₦) — 0 for Free</label>
          <input type="number" min={0} step={100} value={form.priceCents / 100} onChange={(e) => set("priceCents", Math.round(Number(e.target.value) * 100))}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary" />
        </div>
      </div>

      {form.coverUrl && (
        <div className="rounded-lg overflow-hidden border border-border">
          <img src={form.coverUrl} alt="Cover preview" className="w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:text-foreground transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
          {saving ? "Saving..." : "Save Bootcamp"}
        </button>
      </div>
    </form>
  );
}

const DELIVERY_ICONS: Record<string, React.ReactNode> = {
  video: <Video className="w-3.5 h-3.5" />,
  live: <Radio className="w-3.5 h-3.5" />,
  text: <FileText className="w-3.5 h-3.5" />,
  hybrid: <Layers className="w-3.5 h-3.5" />,
};

const DIFF_COLORS: Record<string, string> = {
  beginner: "text-emerald-400 bg-emerald-400/15",
  intermediate: "text-amber-400 bg-amber-400/15",
  advanced: "text-red-400 bg-red-400/15",
};

interface BootcampsPageProps {
  onSelectBootcamp: (b: AdminBootcamp) => void;
}

export default function BootcampsPage({ onSelectBootcamp }: BootcampsPageProps) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: bootcamps = [], isLoading } = useQuery({
    queryKey: ["admin-bootcamps"],
    queryFn: api.listBootcamps,
  });

  const create = useMutation({
    mutationFn: api.createBootcamp,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bootcamps"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); setShowCreate(false); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BootcampFormData> }) => api.updateBootcamp(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bootcamps"] }); setEditingId(null); },
  });

  const del = useMutation({
    mutationFn: api.deleteBootcamp,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bootcamps"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); },
  });

  const handleDelete = (b: AdminBootcamp) => {
    if (!confirm(`Delete "${b.title}"? This cannot be undone.`)) return;
    del.mutate(b.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bootcamps</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{bootcamps.length} bootcamp{bootcamps.length !== 1 ? "s" : ""} registered</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> New Bootcamp
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-primary/30 bg-card p-5">
          <h2 className="font-semibold text-foreground mb-4">Create Bootcamp</h2>
          <BootcampForm
            onSave={(d) => create.mutateAsync(d)}
            onCancel={() => setShowCreate(false)}
            saving={create.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : bootcamps.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">No bootcamps yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first bootcamp to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bootcamps.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {editingId === b.id ? (
                <div className="p-5">
                  <h3 className="font-semibold text-foreground mb-4">Edit: {b.title}</h3>
                  <BootcampForm
                    initial={b}
                    onSave={(d) => update.mutateAsync({ id: b.id, data: d })}
                    onCancel={() => setEditingId(null)}
                    saving={update.isPending}
                  />
                </div>
              ) : (
                <div className="flex items-stretch">
                  {b.coverUrl && (
                    <div className="w-24 shrink-0 hidden sm:block">
                      <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[b.difficulty] ?? ""}`}>
                            {b.difficulty}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                            {DELIVERY_ICONS[b.deliveryMedium]} {b.deliveryMedium}
                          </span>
                          {b.priceCents > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400">
                              <Star className="w-3 h-3" /> {formatPrice(b.priceCents)}
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-400">Free</span>
                          )}
                        </div>
                        <p className="font-semibold text-foreground text-sm truncate">{b.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{b.subtitle}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {b.modulesCount} modules</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {b.enrollmentCount} enrolled</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => onSelectBootcamp(b)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Manage modules">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(b.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(b)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
