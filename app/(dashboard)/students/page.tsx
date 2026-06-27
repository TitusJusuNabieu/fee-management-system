"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { formatCurrency, formatDate, getPaymentStatus, getAcademicYears, LEVELS, PROGRAMMES } from "@/lib/utils";

type Student = {
  id: string;
  publicId: string;
  fullName: string;
  idNumber: string;
  programme: string;
  academicYear: string;
  level: string;
  expectedFees: number;
  feesPaid: number;
};

function StudentsPageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterProgramme, setFilterProgramme] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [importOpen, setImportOpen] = useState(searchParams.get("import") === "1");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  type FailedRow = { sheet: string; row: number; name: string; idNumber: string; reason: string };
  type ImportResult = { created: number; skipped: number; paymentsRecorded: number; errors: string[]; failedRows: FailedRow[]; sheets: string[] };
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEditor = session?.user?.role !== "VIEWER";
  const isAdmin = session?.user?.role === "SUPER_ADMIN";

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (filterYear) qs.set("academicYear", filterYear);
    if (filterLevel) qs.set("level", filterLevel);
    if (filterProgramme) qs.set("programme", filterProgramme);
    qs.set("limit", "500");

    const res = await fetch(`/api/students?${qs}`);
    const data = await res.json();
    setStudents(data.students || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [search, filterYear, filterLevel, filterProgramme]);

  useEffect(() => {
    const t = setTimeout(fetchStudents, 300);
    return () => clearTimeout(t);
  }, [fetchStudents]);

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", importFile);
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const data = await res.json();
    setImportResult(data);
    setImporting(false);
    if (data.created > 0) fetchStudents();
  };

  const downloadFailedRows = (failedRows: FailedRow[]) => {
    import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(
        failedRows.map((r) => ({
          Sheet: r.sheet,
          "Row #": r.row,
          "Student Name": r.name,
          "ID / Matric No": r.idNumber,
          Reason: r.reason,
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws, "Failed Rows");
      XLSX.writeFile(wb, `import-errors-${Date.now()}.xlsx`);
    });
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/students/${id}`, { method: "DELETE" });
    setDeleteId(null);
    fetchStudents();
  };

  const academicYears = getAcademicYears();

  const displayedStudents = filterStatus
    ? students.filter((s) => {
        const { color } = getPaymentStatus(s.expectedFees, s.feesPaid);
        if (filterStatus === "fully_paid") return color === "green";
        if (filterStatus === "partial") return color === "yellow";
        if (filterStatus === "unpaid") return color === "red";
        return true;
      })
    : students;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm mt-0.5">{displayedStudents.length} record{displayedStudents.length !== 1 ? "s" : ""}{filterStatus ? ` (of ${total})` : ""}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isEditor && (
            <>
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import
              </button>
              <Link
                href="/students/new"
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Student
              </Link>
            </>
          )}
          <div className="flex items-center gap-2">
            <a
              href="/api/export?format=xlsx"
              className="flex items-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Excel
            </a>
            <a
              href="/api/export?format=csv"
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              CSV
            </a>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name, ID, programme..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterProgramme}
          onChange={(e) => setFilterProgramme(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Programmes</option>
          {PROGRAMMES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Years</option>
          {academicYears.map((y) => <option key={y}>{y}</option>)}
        </select>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Levels</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="fully_paid">Fully Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Student</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Programme</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Year / Level</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Expected</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Paid</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td>
                </tr>
              )}
              {!loading && displayedStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No students found.{" "}
                    {isEditor && <Link href="/students/new" className="text-blue-600 hover:underline">Add one →</Link>}
                  </td>
                </tr>
              )}
              {displayedStudents.map((s) => {
                const { label, color } = getPaymentStatus(s.expectedFees, s.feesPaid);
                const statusClasses = {
                  green: "bg-green-100 text-green-700",
                  yellow: "bg-yellow-100 text-yellow-700",
                  red: "bg-red-100 text-red-700",
                }[color];
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.id}`} className="hover:underline">
                        <p className="font-medium text-gray-900">{s.fullName}</p>
                        <p className="text-gray-400 text-xs">{s.idNumber}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{s.programme}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      {s.academicYear} · L{s.level}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {formatCurrency(s.expectedFees)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {formatCurrency(s.feesPaid)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusClasses}`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/students/${s.id}`}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View / Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <a
                          href={`/s/${s.publicId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="QR / Public View"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16m-4 0h4m-4 0V12m0 8v-4" />
                          </svg>
                        </a>
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteId(s.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Import Students</h3>
              <button onClick={() => { setImportOpen(false); setImportResult(null); setImportFile(null); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">Required columns (Excel / CSV):</p>
                <p>Full Name, ID Number, Programme, Academic Year, Level, Expected Fees</p>
              </div>
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {importFile ? (
                  <p className="text-sm font-medium text-blue-600">{importFile.name}</p>
                ) : (
                  <p className="text-sm text-gray-500">Click to select an Excel or CSV file</p>
                )}
              </div>

              {importResult && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                  <div className="flex items-center gap-2 text-green-700 font-semibold">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {importResult.created} students imported, {importResult.paymentsRecorded} payments recorded
                  </div>
                  {importResult.sheets.length > 0 && (
                    <p className="text-gray-500 text-xs">Sheets: {importResult.sheets.join(", ")}</p>
                  )}
                  {importResult.skipped > 0 && (
                    <p className="text-amber-600 text-xs">⚠ {importResult.skipped} rows skipped (duplicates)</p>
                  )}
                  {importResult.failedRows.length > 0 && (
                    <div className="border border-red-200 rounded-lg overflow-hidden mt-2">
                      <div className="flex items-center justify-between px-3 py-2 bg-red-50">
                        <span className="text-red-700 text-xs font-semibold">
                          {importResult.failedRows.length} failed row{importResult.failedRows.length !== 1 ? "s" : ""}
                        </span>
                        <button
                          onClick={() => downloadFailedRows(importResult.failedRows)}
                          className="text-xs text-red-600 hover:underline font-medium flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download errors.xlsx
                        </button>
                      </div>
                      <div className="max-h-36 overflow-y-auto">
                        {importResult.failedRows.slice(0, 20).map((r, i) => (
                          <div key={i} className="flex items-start gap-2 px-3 py-1.5 border-t border-red-100 text-xs">
                            <span className="text-gray-400 flex-shrink-0">Row {r.row}</span>
                            <span className="font-medium text-gray-700 truncate flex-1">{r.name || "(blank)"}</span>
                            <span className="text-red-500 flex-shrink-0">{r.reason}</span>
                          </div>
                        ))}
                        {importResult.failedRows.length > 20 && (
                          <p className="text-center text-gray-400 text-xs py-2">...and {importResult.failedRows.length - 20} more — download Excel for full list</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                {importing ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Student?</h3>
            <p className="text-gray-500 text-sm mb-6">This will permanently remove the student and all payment history.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense>
      <StudentsPageInner />
    </Suspense>
  );
}
