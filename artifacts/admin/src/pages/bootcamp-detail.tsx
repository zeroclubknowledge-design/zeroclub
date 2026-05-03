import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type AdminBootcamp, type AdminModule, type ModuleFormData } from "@/lib/api";
import { ArrowLeft, Plus, Edit2, Trash2, Clock, Zap, GripVertical, Check } from "lucide-react";

interface ModuleFormProps {
  initial?: Partial<ModuleFormData>;
  onSave: (data: ModuleFormData) => Promise<unknown>;
  onCancel: () => void;
  saving: boolean;
}

function ModuleForm({ initial, onSave, onCancel, saving }: ModuleFormProps) {
  const [form, setForm] = useState<ModuleFormData>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    durationMinutes: initial?.durationMinutes ?? 20,
    xpReward: initial?.xpReward ?? 25,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-background rounded-xl p-4 border border-border">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Module Title *</label>
        <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required
          className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary" />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Description *</label>
        <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required rows={2}
          className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary resize-none" />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Duration (min)</label>
          <input type="number" min={1} value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
            className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted-foreground mb-1">XP Reward</label>
          <input type="number" min={0} value={form.xpReward} onChange={(e) => setForm((f) => ({ ...f, xpReward: Number(e.target.value) }))}
            className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs hover:text-foreground transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60">
          {saving ? "Saving..." : "Save Module"}
        </button>
      </div>
    </form>
  );
}

interface BootcampDetailPageProps {
  bootcamp: AdminBootcamp;
  onBack: () => void;
}

export default function BootcampDetailPage({ bootcamp, onBack }: BootcampDetailPageProps) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  const { data: current } = useQuery({
    queryKey: ["admin-bootcamps"],
    queryFn: api.listBootcamps,
    select: (list) => list.find((b) => b.id === bootcamp.id),
  });

  const bc = current ?? bootcamp;
  const modules: AdminModule[] = bc.modules ?? [];

  const addModule = useMutation({
    mutationFn: (data: ModuleFormData) => api.createModule(bc.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bootcamps"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); setShowAdd(false); },
  });

  const editModule = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ModuleFormData> }) => api.updateModule(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bootcamps"] }); setEditingModuleId(null); },
  });

  const delModule = useMutation({
    mutationFn: api.deleteModule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bootcamps"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); },
  });

  const handleDeleteModule = (m: AdminModule) => {
    if (!confirm(`Delete module "${m.title}"?`)) return;
    delModule.mutate(m.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{bc.title}</h1>
          <p className="text-sm text-muted-foreground">{modules.length} module{modules.length !== 1 ? "s" : ""} · {bc.difficulty} · {bc.deliveryMedium}</p>
        </div>
      </div>

      {bc.coverUrl && (
        <div className="rounded-xl overflow-hidden border border-border h-36">
          <img src={bc.coverUrl} alt={bc.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">{bc.description}</p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Curriculum Modules</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /> Add Module
        </button>
      </div>

      {showAdd && (
        <ModuleForm
          onSave={(d) => addModule.mutateAsync(d)}
          onCancel={() => setShowAdd(false)}
          saving={addModule.isPending}
        />
      )}

      {modules.length === 0 && !showAdd ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground text-sm">No modules yet. Add the first module to build the curriculum.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {modules.map((m, idx) => (
            <div key={m.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {editingModuleId === m.id ? (
                <div className="p-3">
                  <ModuleForm
                    initial={m}
                    onSave={(d) => editModule.mutateAsync({ id: m.id, data: d })}
                    onCancel={() => setEditingModuleId(null)}
                    saving={editModule.isPending}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3">
                  <div className="flex items-center gap-2 shrink-0">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{idx + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{m.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.durationMinutes}m</span>
                      <span className="flex items-center gap-1 text-amber-400"><Zap className="w-3 h-3" />+{m.xpReward} XP</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditingModuleId(m.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteModule(m)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
