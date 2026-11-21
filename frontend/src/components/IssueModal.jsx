import { useState } from "react";
import { Trash2, X } from "lucide-react";
import API from "../services/api";

const TYPES = ["Bug", "Task", "Feature"];
const PRIORITIES = ["Low", "Medium", "High"];
const STATUSES = ["To Do", "In Progress", "Done"];

function IssueModal({ issue, members, myRole, canEdit, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: issue.title,
    description: issue.description || "",
    issue_type: issue.issue_type,
    priority: issue.priority,
    status: issue.status,
    assigned_to: issue.assigned_to ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await API.put(`/issues/${issue.id}`, {
        ...form,
        project_id: issue.project_id,
        assigned_to: form.assigned_to === "" ? null : Number(form.assigned_to),
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete issue #${issue.id}? This can't be undone.`)) return;

    try {
      await API.delete(`/issues/${issue.id}`);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to delete issue.");
    }
  };

  const fieldClass =
    "w-full border rounded-lg p-2 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Issue #{issue.id}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {!canEdit && (
          <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            You have read-only access to this issue.
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input name="title" required disabled={!canEdit} value={form.title} onChange={handleChange} className={fieldClass} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea name="description" rows={4} disabled={!canEdit} value={form.description} onChange={handleChange} className={fieldClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select name="issue_type" disabled={!canEdit} value={form.issue_type} onChange={handleChange} className={fieldClass}>
                {TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Priority</label>
              <select name="priority" disabled={!canEdit} value={form.priority} onChange={handleChange} className={fieldClass}>
                {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select name="status" disabled={!canEdit} value={form.status} onChange={handleChange} className={fieldClass}>
                {STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Assignee</label>
              <select name="assigned_to" disabled={!canEdit} value={form.assigned_to} onChange={handleChange} className={fieldClass}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>{member.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {myRole === "Admin" ? (
              <button type="button" onClick={handleDelete} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
                <Trash2 size={16} /> Delete
              </button>
            ) : <span />}

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50">
                {canEdit ? "Cancel" : "Close"}
              </button>
              {canEdit && (
                <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving ? "Saving..." : "Save changes"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default IssueModal;
