"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatCurrency, formatDate, getPaymentStatus, PROGRAMMES, LEVELS, getAcademicYears } from "@/lib/utils";

type Payment = {
  id: string;
  amount: number;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
};

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
  payments: Payment[];
  createdAt: string;
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const printRef = useRef<HTMLDivElement>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  const [paymentForm, setPaymentForm] = useState({ amount: "", reference: "", notes: "", paymentDate: "" });
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const isEditor = session?.user?.role !== "VIEWER";
  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  const academicYears = getAcademicYears();

  const fetchStudent = async () => {
    const res = await fetch(`/api/students/${id}`);
    if (!res.ok) { router.push("/students"); return; }
    const data = await res.json();
    setStudent(data);
    setEditForm(data);
    setLoading(false);

    // Generate QR code
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const qrRes = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${appUrl}/s/${data.publicId}`)}`);
    if (qrRes.ok) setQrUrl(qrRes.url);
    // Generate locally for reliability
    try {
      const QRCode = await import("qrcode");
      const dataUrl = await QRCode.default.toDataURL(`${appUrl}/s/${data.publicId}`, { width: 200, margin: 2 });
      setQrUrl(dataUrl);
    } catch { /* fallback to external service */ }
  };

  useEffect(() => { fetchStudent(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    setStudent((s) => s ? { ...s, ...data } : null);
    setEditing(false);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError("");
    setSaving(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: id, ...paymentForm }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setPaymentError(data.error); return; }
    setPaymentForm({ amount: "", reference: "", notes: "", paymentDate: "" });
    setAddingPayment(false);
    fetchStudent();
  };

  const handleDeletePayment = async (payId: string) => {
    await fetch(`/api/payments/${payId}`, { method: "DELETE" });
    setDeletePaymentId(null);
    fetchStudent();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  if (!student) return null;

  const feesPaid = student.payments.reduce((s, p) => s + p.amount, 0);
  const balance = student.expectedFees - feesPaid;
  const { label: statusLabel, color: statusColor } = getPaymentStatus(student.expectedFees, feesPaid);
  const statusClasses = { green: "bg-green-100 text-green-700 border-green-200", yellow: "bg-yellow-100 text-yellow-700 border-yellow-200", red: "bg-red-100 text-red-700 border-red-200" }[statusColor];

  return (
    <div>
      {/* Print-only ticket */}
      <div className="print-only" ref={printRef}>
        <div style={{ fontFamily: "serif", maxWidth: 600, margin: "0 auto", padding: 32 }}>
          <div style={{ textAlign: "center", borderBottom: "3px solid #1e3a8a", paddingBottom: 16, marginBottom: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/enc-logo-removebg.png" alt="ENC Logo" style={{ width: 72, height: 72, margin: "0 auto 8px" }} />
            <h1 style={{ fontSize: 20, fontWeight: "bold", color: "#1e3a8a", margin: 0, letterSpacing: 1 }}>EVERY NATION COLLEGE</h1>
            <p style={{ fontSize: 11, color: "#6b7280", margin: "3px 0 0" }}>Equipping Leaders for Effective Services</p>
            <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 8px" }}>Bo, Sierra Leone · enc.edu.sl</p>
            <div style={{ display: "inline-block", background: "#d97706", color: "white", padding: "4px 18px", borderRadius: 20 }}>
              <p style={{ fontSize: 11, fontWeight: "bold", margin: 0, letterSpacing: 2 }}>FEE RECEIPT</p>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: "bold" }}>{student.fullName}</h2>
              <p style={{ color: "#6b7280", fontSize: 12 }}>ID: {student.idNumber}</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>{student.programme}</p>
              <p style={{ fontSize: 12, color: "#6b7280" }}>A/Y: {student.academicYear} · Level {student.level}</p>
            </div>
            {qrUrl && <img src={qrUrl} alt="QR" style={{ width: 100, height: 100 }} />}
          </div>
          <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              <tr style={{ background: "#f9fafb" }}>
                <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>Expected Fees</td>
                <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb", textAlign: "right", fontWeight: "bold" }}>{formatCurrency(student.expectedFees)}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>Total Paid</td>
                <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb", textAlign: "right", fontWeight: "bold", color: "#059669" }}>{formatCurrency(feesPaid)}</td>
              </tr>
              <tr style={{ background: "#f9fafb" }}>
                <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb", fontWeight: "bold" }}>Balance</td>
                <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb", textAlign: "right", fontWeight: "bold", color: balance > 0 ? "#dc2626" : "#059669" }}>{formatCurrency(balance)}</td>
              </tr>
            </tbody>
          </table>
          {student.payments.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>Payment History</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={{ padding: "6px 10px", border: "1px solid #e5e7eb", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "6px 10px", border: "1px solid #e5e7eb", textAlign: "right" }}>Amount</th>
                    <th style={{ padding: "6px 10px", border: "1px solid #e5e7eb", textAlign: "left" }}>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {student.payments.map((p) => (
                    <tr key={p.id}>
                      <td style={{ padding: "6px 10px", border: "1px solid #e5e7eb" }}>{formatDate(p.paymentDate)}</td>
                      <td style={{ padding: "6px 10px", border: "1px solid #e5e7eb", textAlign: "right" }}>{formatCurrency(p.amount)}</td>
                      <td style={{ padding: "6px 10px", border: "1px solid #e5e7eb" }}>{p.reference || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ textAlign: "center", fontSize: 10, color: "#9ca3af", marginTop: 24 }}>
            Printed {new Date().toLocaleString()} · Scan QR code to verify
          </p>
        </div>
      </div>

      {/* Screen view */}
      <div className="no-print">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/students" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{student.fullName}</h1>
              <p className="text-gray-500 text-sm">ID: {student.idNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/s/${student.publicId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Public View
            </a>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Student info + fees summary */}
          <div className="lg:col-span-2 space-y-5">
            {/* Student info card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Student Information</h2>
                {isEditor && (
                  <button
                    onClick={() => editing ? handleSave() : setEditing(true)}
                    disabled={saving}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      editing ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {editing ? (saving ? "Saving..." : "Save Changes") : "Edit"}
                  </button>
                )}
              </div>

              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

              {editing ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                    <input name="fullName" value={editForm.fullName || ""} onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">ID Number</label>
                    <input value={editForm.idNumber || ""} onChange={(e) => setEditForm((f) => ({ ...f, idNumber: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Expected Fees</label>
                    <input type="number" value={editForm.expectedFees || ""} onChange={(e) => setEditForm((f) => ({ ...f, expectedFees: parseFloat(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Programme</label>
                    <select value={editForm.programme || ""} onChange={(e) => setEditForm((f) => ({ ...f, programme: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {PROGRAMMES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Academic Year</label>
                    <select value={editForm.academicYear || ""} onChange={(e) => setEditForm((f) => ({ ...f, academicYear: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {academicYears.map((y) => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Level</label>
                    <select value={editForm.level || ""} onChange={(e) => setEditForm((f) => ({ ...f, level: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {LEVELS.map((l) => <option key={l} value={l}>Level {l}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name", value: student.fullName },
                    { label: "ID Number", value: student.idNumber },
                    { label: "Programme", value: student.programme },
                    { label: "Academic Year", value: student.academicYear },
                    { label: "Level", value: `Level ${student.level}` },
                    { label: "Registered", value: formatDate(student.createdAt) },
                  ].map((f) => (
                    <div key={f.label}>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{f.label}</p>
                      <p className="text-gray-900 font-medium mt-0.5">{f.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fee Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">Fee Summary</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(student.expectedFees)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Expected</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-xl">
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(feesPaid)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Paid</p>
                </div>
                <div className={`text-center p-3 rounded-xl ${balance > 0 ? "bg-red-50" : "bg-green-50"}`}>
                  <p className={`text-xl font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(balance)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Balance</p>
                </div>
              </div>
              {student.expectedFees > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (feesPaid / student.expectedFees) * 100)}%` }}
                  />
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{student.expectedFees > 0 ? Math.round((feesPaid / student.expectedFees) * 100) : 0}% paid</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusClasses}`}>{statusLabel}</span>
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Payment History</h2>
                {isEditor && (
                  <button
                    onClick={() => setAddingPayment(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Payment
                  </button>
                )}
              </div>
              <div>
                {student.payments.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">No payments recorded yet</div>
                )}
                {student.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-6 py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-semibold text-gray-900">{formatCurrency(p.amount)}</p>
                      {p.reference && <p className="text-xs text-gray-400">Ref: {p.reference}</p>}
                      {p.notes && <p className="text-xs text-gray-400">{p.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{formatDate(p.paymentDate)}</span>
                      {isEditor && (
                        <button
                          onClick={() => setDeletePaymentId(p.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: QR Code */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
              <h2 className="font-semibold text-gray-800 mb-4">QR Code</h2>
              {qrUrl ? (
                <img src={qrUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl border border-gray-200" />
              ) : (
                <div className="w-48 h-48 mx-auto rounded-xl bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Loading QR...</span>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">Scan to verify student record</p>
              <a
                href={`/s/${student.publicId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-blue-600 hover:underline"
              >
                Open public view
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Quick stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-3">Info</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Payments</span><span className="font-medium">{student.payments.length}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Last payment</span><span className="font-medium">{student.payments[0] ? formatDate(student.payments[0].paymentDate) : "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Progress</span><span className="font-medium">{student.expectedFees > 0 ? Math.round((feesPaid / student.expectedFees) * 100) : 0}%</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Payment Modal */}
      {addingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Add Payment</h3>
              <button onClick={() => setAddingPayment(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              {paymentError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{paymentError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (GHS) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="500.00"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference / Receipt No.</label>
                <input
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="RCP-2024-001"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                <input
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. First installment"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setAddingPayment(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
                  {saving ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Payment Confirm */}
      {deletePaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Payment?</h3>
            <p className="text-gray-500 text-sm mb-6">This payment record will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletePaymentId(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDeletePayment(deletePaymentId)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
