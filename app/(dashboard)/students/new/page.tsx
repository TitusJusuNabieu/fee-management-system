"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PROGRAMMES, LEVELS, getAcademicYears } from "@/lib/utils";

export default function NewStudentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    idNumber: "",
    programme: "",
    academicYear: "",
    level: "",
    expectedFees: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, expectedFees: parseFloat(form.expectedFees) }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Failed to create student");
      return;
    }

    router.push(`/students/${data.id}`);
  };

  const academicYears = getAcademicYears();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/students" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Student</h1>
          <p className="text-gray-500 text-sm mt-0.5">Register a new student record</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                placeholder="John Kwame Asante"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ID Number</label>
              <input
                name="idNumber"
                value={form.idNumber}
                onChange={handleChange}
                required
                placeholder="ENC/2024/001"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Fees (GHS)</label>
              <input
                name="expectedFees"
                type="number"
                min="0"
                step="0.01"
                value={form.expectedFees}
                onChange={handleChange}
                required
                placeholder="2500.00"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Programme of Study</label>
              <select
                name="programme"
                value={form.programme}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select programme...</option>
                {PROGRAMMES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Academic Year</label>
              <select
                name="academicYear"
                value={form.academicYear}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select year...</option>
                {academicYears.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Level</label>
              <select
                name="level"
                value={form.level}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select level...</option>
                {LEVELS.map((l) => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/students"
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-center hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? "Saving..." : "Create Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
