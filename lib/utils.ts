export function formatCurrency(amount: number): string {
  // Sierra Leone New Leone (NLE) — "Le" prefix, no ISO code in Intl so we format manually
  const formatted = new Intl.NumberFormat("en-SL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${amount < 0 ? "-" : ""}Le ${formatted}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getPaymentStatus(expected: number, paid: number) {
  if (paid <= 0) return { label: "Unpaid", color: "red" };
  if (paid >= expected) return { label: "Fully Paid", color: "green" };
  return { label: "Partial", color: "yellow" };
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  FINANCE: "FINANCE",
  VIEWER: "VIEWER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  FINANCE: "Finance",
  VIEWER: "Viewer",
};

export const FACULTIES = [
  "Agriculture",
  "Social Science",
  "Technology",
  "Health Science",
  "Theology",
  "Education",
];

export const PROGRAMMES = [
  // Agriculture
  "BSc Agriculture (General)",
  "BSc Agriculture (Crop Science)",
  // Social Science
  "BSc Accounting",
  "BSc Business Administration",
  "BSc Economics",
  "BSc Public Administration",
  // Technology
  "BSc Computer Science",
  "BSc Information Technology",
  // Health Science
  "BSc Public Health",
  "BSc Medical Laboratory Science",
  "BSc Nursing",
  // Theology
  "Bachelor of Theology",
  "Diploma in Theology",
  // Education
  "Bachelor of Education",
  "Diploma in Education",
  // Other
  "Other",
];

export const LEVELS = [
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
];

export const FACULTY_MAP: Record<string, string> = {
  AGRICULTURE: "Agriculture",
  "SOCIAL SCIENCE": "Social Science",
  TECHNOLOGY: "Technology",
  "HEALTH SCIENCE": "Health Science",
  THEOLOGY: "Theology",
  EDUCATION: "Education",
};

export function getAcademicYears(): string[] {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let y = current + 1; y >= current - 4; y--) {
    years.push(`${y - 1}/${y}`);
  }
  return years;
}

export const APP_NAME = "ENC Fee Management System";
export const INSTITUTION_NAME = "Every Nation College";
export const INSTITUTION_SHORT = "ENC";
export const INSTITUTION_TAGLINE = "Equipping Leaders for Effective Services";
export const INSTITUTION_LOCATION = "Bo, Sierra Leone";
