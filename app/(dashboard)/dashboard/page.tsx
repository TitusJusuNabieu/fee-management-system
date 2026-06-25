import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  const [
    totalStudents,
    students,
    recentPayments,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.findMany({ include: { payments: { select: { amount: true } } } }),
    prisma.payment.findMany({
      take: 8,
      orderBy: { paymentDate: "desc" },
      include: { student: { select: { fullName: true, idNumber: true } } },
    }),
  ]);

  const totalExpected = students.reduce((s, st) => s + st.expectedFees, 0);
  const totalPaid = students.reduce(
    (s, st) => s + st.payments.reduce((ps, p) => ps + p.amount, 0),
    0
  );
  const totalBalance = totalExpected - totalPaid;
  const fullyPaid = students.filter((st) => {
    const paid = st.payments.reduce((s, p) => s + p.amount, 0);
    return paid >= st.expectedFees;
  }).length;

  const stats = [
    {
      label: "Total Students",
      value: totalStudents.toString(),
      sub: `${fullyPaid} fully paid`,
      color: "bg-blue-600",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Expected Fees",
      value: formatCurrency(totalExpected),
      sub: "Total across all students",
      color: "bg-indigo-600",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: "Fees Collected",
      value: formatCurrency(totalPaid),
      sub: `${totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0}% of target`,
      color: "bg-emerald-600",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Outstanding",
      value: formatCurrency(totalBalance),
      sub: `${totalStudents - fullyPaid} students with balance`,
      color: "bg-rose-600",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session?.user?.name} · Every Nation College</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 truncate">{stat.value}</p>
            <p className="text-sm font-medium text-gray-600 mt-0.5">{stat.label}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Recent Payments</h2>
            <Link href="/students" className="text-xs text-blue-600 hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentPayments.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">No payments yet</p>
            )}
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.student.fullName}</p>
                  <p className="text-xs text-gray-400">{p.student.idNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-600">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.paymentDate).toLocaleDateString("en-GB", {
                      day: "2-digit", month: "short", year: "numeric"
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Quick Actions</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            <Link
              href="/students/new"
              className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-center"
            >
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-blue-700">Add Student</span>
            </Link>
            <Link
              href="/students"
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-center"
            >
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Search Students</span>
            </Link>
            <Link
              href="/students?import=1"
              className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors text-center"
            >
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <span className="text-sm font-medium text-green-700">Import CSV/Excel</span>
            </Link>
            <a
              href="/api/export?format=xlsx"
              className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors text-center"
            >
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-purple-700">Export Excel</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
