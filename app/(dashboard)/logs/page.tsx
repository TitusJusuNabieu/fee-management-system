"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Log = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string; email: string };
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  IMPORT: "bg-purple-100 text-purple-700",
  LOGIN: "bg-gray-100 text-gray-700",
};

export default function LogsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (session && session.user.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
    }
  }, [session]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterAction) qs.set("action", filterAction);
    if (filterEntity) qs.set("entityType", filterEntity);
    qs.set("page", String(page));
    qs.set("limit", "50");
    const res = await fetch(`/api/logs?${qs}`);
    const data = await res.json();
    setLogs(data.logs || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [filterAction, filterEntity, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-500 text-sm mt-0.5">{total} event{total !== 1 ? "s" : ""} recorded</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="IMPORT">Import</option>
        </select>
        <select
          value={filterEntity}
          onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Entities</option>
          <option value="Student">Student</option>
          <option value="Payment">Payment</option>
          <option value="User">User</option>
        </select>
        <button onClick={() => fetchLogs()} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Action</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Details</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">User</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden lg:table-cell">IP</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading...</td></tr>
              )}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No logs found.</td></tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"}`}>
                        {log.action}
                      </span>
                      <p className="text-gray-400 text-xs mt-0.5">{log.entityType}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 max-w-xs">
                    <p className="truncate">{log.details || "—"}</p>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <p className="font-medium text-gray-800">{log.user.name}</p>
                    <p className="text-gray-400 text-xs">{log.user.email}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs hidden lg:table-cell">{log.ipAddress || "—"}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {new Date(log.createdAt).toLocaleString("en-GB", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
