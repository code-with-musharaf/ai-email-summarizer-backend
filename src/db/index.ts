import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
export let db: ReturnType<typeof drizzle>;

export const makeConnection = async () => {
  try {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      console.error(" DATABASE_URL is missing");
      return;
    }

    console.log("Connecting to the database...");

    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    db = drizzle(pool);

    console.log("Database connected successfully");
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
};
