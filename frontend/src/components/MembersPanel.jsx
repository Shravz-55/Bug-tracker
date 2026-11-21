import { useEffect, useState } from "react";
import { X, Trash2, UserPlus } from "lucide-react";
import API from "../services/api";

const ROLES = ["Admin", "Developer", "Viewer"];

function MembersPanel({ projectId, myRole, onClose }) {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Developer");
  const [error, setError] = useState("");
  const isAdmin = myRole === "Admin";

  const fetchMembers = async () => {
    try {
      const res = await API.get(`/projects/${projectId}/members`);
      setMembers(res.data);
    } catch {
      setError("Unable to load members.");
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  const run = async (request) => {
    setError("");
    try {
      await request();
      await fetchMembers();
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.");
    }
  };

  const addMember = (e) => {
    e.preventDefault();
    run(async () => {
      await API.post(`/projects/${projectId}/members`, { email, role });
      setEmail("");
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-800">Project Members</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</p>
        )}

        <ul className="divide-y max-h-72 overflow-y-auto">
          {members.map((m) => (
            <li key={m.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-800 truncate">{m.name}</p>
                <p className="text-xs text-slate-500 truncate">{m.email}</p>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <select
                    value={m.role}
                    onChange={(e) =>
                      run(() =>
                        API.patch(`/projects/${projectId}/members/${m.user_id}`, {
                          role: e.target.value,
                        })
                      )
                    }
                    className="border rounded-lg p-1 text-sm bg-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-slate-600">{m.role}</span>
                )}

                {isAdmin && (
                  <button
                    onClick={() =>
                      run(() => API.delete(`/projects/${projectId}/members/${m.user_id}`))
                    }
                    className="text-slate-400 hover:text-red-600"
                    title="Remove member"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {isAdmin && (
          <form onSubmit={addMember} className="flex gap-2 mt-5">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Add by email"
              className="min-w-0 flex-1 border rounded-lg p-2 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border rounded-lg p-2 text-sm bg-white"
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg flex items-center gap-1 text-sm"
            >
              <UserPlus size={16} /> Add
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default MembersPanel;
