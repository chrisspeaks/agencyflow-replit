import { db } from "../server/db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function initializeAdmin() {
  const adminEmail = "admin@website.com";
  const adminPassword = "Admin123";

  try {
    const [existingUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, adminEmail));

    if (existingUser) {
      console.log("Admin user already exists, skipping creation.");
      return;
    }

    console.log("Creating default admin user...");

    const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);

    const [newUser] = await db.insert(schema.users).values({
      email: adminEmail,
      passwordHash: hashedPassword,
    }).returning();

    await db.insert(schema.profiles).values({
      id: newUser.id,
      email: adminEmail,
      fullName: "System Administrator",
      role: "admin",
    });

    await db.insert(schema.userRoles).values({
      userId: newUser.id,
      role: "admin",
    });

    console.log("Default admin user created successfully!");
    console.log("Email: admin@website.com");
    console.log("Password: Admin123");
    console.log("IMPORTANT: Change this password after first login!");
  } catch (error) {
    console.error("Error initializing admin user:", error);
  }
}

initializeAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
