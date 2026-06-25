import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import QRCode from "qrcode";
import Image from "next/image";

export default async function PublicStudentPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  const student = await prisma.student.findUnique({
    where: { publicId },
    include: { payments: { orderBy: { paymentDate: "desc" } } },
  });

  if (!student) notFound();

  const feesPaid = student.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = student.expectedFees - feesPaid;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const qrDataUrl = await QRCode.toDataURL(`${appUrl}/s/${student.publicId}`, {
    width: 200,
    margin: 2,
    color: { dark: "#1e3a8a", light: "#ffffff" },
  });

  const statusColor =
    feesPaid <= 0
      ? "bg-red-100 text-red-700 border-red-200"
      : feesPaid >= student.expectedFees
      ? "bg-green-100 text-green-700 border-green-200"
      : "bg-amber-100 text-amber-700 border-amber-200";

  const statusLabel =
    feesPaid <= 0 ? "Unpaid" : feesPaid >= student.expectedFees ? "Fully Paid" : "Partial";

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5" style={{ background: "linear-gradient(135deg, #162d6d 0%, #1e3a8a 100%)" }}>
          <Image src="/enc-logo.png" alt="ENC Logo" width={56} height={56} className="flex-shrink-0" />
          <div className="text-white">
            <p className="font-bold text-base leading-tight">Every Nation College</p>
            <p className="text-blue-200 text-xs">Equipping Leaders for Effective Services</p>
            <p className="text-blue-300 text-xs mt-0.5">Bo, Sierra Leone · enc.edu.sl</p>
          </div>
        </div>

        {/* Title bar */}
        <div className="px-6 py-3 text-center" style={{ backgroundColor: "#d97706" }}>
          <p className="text-white font-semibold text-sm tracking-wide uppercase">
            Student Fee Receipt
          </p>
        </div>

        {/* Student Info */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{student.fullName}</h2>
              <p className="text-gray-500 text-sm mt-0.5">Matric No: {student.idNumber}</p>
              <p className="text-gray-700 text-sm mt-1">{student.programme}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">{student.academicYear}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-500">{student.level}</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>
            </div>
            <img src={qrDataUrl} alt="QR Code" className="w-24 h-24 rounded-lg border border-gray-200 flex-shrink-0" />
          </div>
        </div>

        <hr className="border-gray-100 mx-6" />

        {/* Fee Summary */}
        <div className="px-6 py-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">Expected Fees</span>
            <span className="font-semibold text-gray-800">{formatCurrency(student.expectedFees)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">Total Paid</span>
            <span className="font-semibold text-green-600">{formatCurrency(feesPaid)}</span>
          </div>
          <div className="flex justify-between items-center border-t border-gray-100 pt-2.5">
            <span className="text-gray-700 font-medium text-sm">Outstanding Balance</span>
            <span className={`font-bold text-base ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(balance)}
            </span>
          </div>

          {/* Progress bar */}
          {student.expectedFees > 0 && (
            <div className="pt-1">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (feesPaid / student.expectedFees) * 100)}%`,
                    backgroundColor: "#1e3a8a",
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">
                {student.expectedFees > 0 ? Math.round((feesPaid / student.expectedFees) * 100) : 0}% paid
              </p>
            </div>
          )}
        </div>

        {/* Payment History */}
        {student.payments.length > 0 && (
          <div className="px-6 pb-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment History</h3>
            <div className="space-y-1.5">
              {student.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-800">{formatCurrency(p.amount)}</p>
                    {p.reference && <p className="text-gray-400 text-xs">Ref: {p.reference}</p>}
                    {p.notes && <p className="text-gray-400 text-xs">{p.notes}</p>}
                  </div>
                  <span className="text-gray-500 text-xs">{formatDate(p.paymentDate)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 text-center bg-gray-50">
          <p className="text-gray-400 text-xs">
            Verified record · Generated {formatDate(new Date())} · Every Nation College
          </p>
        </div>
      </div>
    </div>
  );
}
