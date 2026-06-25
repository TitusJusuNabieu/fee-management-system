"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatDate, ROLE_LABELS, type Role } from "@/lib/utils";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "VIEWER" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session && session.user.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchUsers();
  }, [session]);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: "", email: "", password: "", role: "VIEWER" });
    setError("");
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
    const method = editUser ? "PUT" : "POST";
    const body = editUser
      ? { name: form.name, email: form.email, role: form.role, ...(form.password && { password: form.password }) }
      : form;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error); return; }
    setShowModal(false);
    fetchUsers();
  };

  const toggleActive = async (u: User) => {
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    fetchUsers();
  };

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: "bg-purple-100 text-purple-700",
    FINANCE: "bg-blue-100 text-blue-700",
    VIEWER: "bg-gray-100 text-gray-700",
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-3 mb-5">
        {(["SUPER_ADMIN", "FINANCE", "VIEWER"] as Role[]).map((r) => (
          <div key={r} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[r]}`}>{ROLE_LABELS[r]}</span>
            <span className="text-gray-400">{r === "SUPER_ADMIN" ? "Full access" : r === "FINANCE" ? "Add / edit records" : "Read only"}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Role</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden lg:table-cell">Added</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 text-xs font-bold">{u.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-gray-400 text-xs">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] || "bg-gray-100 text-gray-700"}`}>
                      {ROLE_LABELS[u.role as Role] || u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-sm hidden lg:table-cell">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {u.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {u.id !== session?.user?.id && (
                        <button
                          onClick={() => toggleActive(u)}
                          className={`p-1.5 rounded-lg transition-colors ${u.isActive ? "text-gray-500 hover:text-orange-600 hover:bg-orange-50" : "text-gray-500 hover:text-green-600 hover:bg-green-50"}`}
                          title={u.isActive ? "Disable" : "Enable"}
                        >
                          {u.isActive ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{editUser ? "Edit User" : "Add User"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jane Asante" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@enc.edu.gh" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{editUser ? "New Password (leave blank to keep)" : "Password"}</label>
                <input type="password" required={!editUser} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="VIEWER">Viewer — Read only</option>
                  <option value="FINANCE">Finance — Add / edit records</option>
                  <option value="SUPER_ADMIN">Super Admin — Full access</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
                  {saving ? "Saving..." : editUser ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
