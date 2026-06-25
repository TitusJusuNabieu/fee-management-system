// Runs once before the Next.js server starts.
// Seeds the default admin account if no users exist.
const { PrismaClient } = require("@prisma/client");
const { hashSync } = require("bcryptjs");

async function seed() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      await prisma.user.create({
        data: {
          name: "System Administrator",
          email: "admin@enc.edu.sl",
          password: hashSync("Admin@1234", 12),
          role: "SUPER_ADMIN",
          isActive: true,
        },
      });
      console.log("Default admin account created: admin@enc.edu.sl / Admin@1234");
      console.log("IMPORTANT: Change this password after first login.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((e) => {
  console.error("Startup seed failed:", e.message);
  process.exit(1);
});
