import { Request, Response } from "express";
import { mockEmails } from "../utils/email.mock";
import { db } from "../db";
import { emails } from "../db/schema/email.schema";
import {
  enhanceSummary,
  summarizeBulkEmail,
  summarizeSingleEmail,
} from "../openai";
import { desc, eq, sql } from "drizzle-orm";

/**
 * Get email summaries with optional category filter.
 */
export const getEmailSummaries = async (req: Request, res: Response) => {
  try {
    const { category = "" } = req.query;
    const term = category.toString().trim();
    let q: any = db.select().from(emails);

    if (term) {
      q = q.where(sql`${emails.category} ILIKE ${`%${term}%`}`);
    }
    q = q.orderBy(desc(emails.createdAt));

    const dbEmails = await q;

    res.status(200).json({
      status: "ok",
      message: "Email Summaries",
      data: dbEmails,
    });
  } catch (error) {
    console.error({ error });
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * Get email counts by category.
 */
export const getCountByCategroy = async (req: Request, res: Response) => {
  try {
    let q: any = db
      .select({
        category: emails.category,
        count: sql`COUNT(*)`,
      })
      .from(emails);

    q = q.groupBy(emails.category).orderBy(sql`COUNT(*)`);

    const rows = await q;

    const result = rows.map((r: any) => ({
      category: r.category ?? "Uncategorized",
      count: Number(r.count ?? 0),
    }));

    return res.status(200).json({
      status: "ok",
      message: "Email counts by category",
      data: result,
    });
  } catch (error) {
    console.error({ error });
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * Helper function to escape CSV values.
 */
function escapeCsv(value: any): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Export emails to CSV.
 */
export const exportEmailsToCsv = async (req: Request, res: Response) => {
  try {
    const rawCategory = req.query.category;
    const category = Array.isArray(rawCategory)
      ? rawCategory[0]
      : rawCategory ?? "";
    const term = (category || "")?.toString().trim();

    const now = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `emails-export-${now}.csv`;

    // Setting Headers for CSV
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.write("\uFEFF");

    // Defing CSV headers
    const headers = [
      "id",
      "sender",
      "subject",
      "summary",
      "category",
      "created_at",
      "body",
    ];
    res.write(headers.join(",") + "\n");

    const BATCH_SIZE = 500;
    let offset = 0;
    let rowCount = 0;

    while (true) {
      let q: any = db
        .select()
        .from(emails)
        .orderBy(desc(emails.createdAt))
        .limit(BATCH_SIZE)
        .offset(offset);

      if (term) {
        q = q.where(sql`${emails.category} ILIKE ${`%${term}%`}`);
      }

      const rows: any[] = await q;
      if (!rows || rows.length === 0) break;

      for (const r of rows) {
        const row = [
          escapeCsv(r.id),
          escapeCsv(r.sender),
          escapeCsv(r.subject),
          escapeCsv(r.summary),
          escapeCsv(r.category),
          escapeCsv(
            r.createdAt
              ? new Date(r.createdAt).toISOString()
              : r.created_at
              ? new Date(r.created_at).toISOString()
              : ""
          ),
          // optional bigger field
          escapeCsv(r.body ?? ""),
        ];
        res.write(row.join(",") + "\n");
        rowCount++;
      }

      // @ts-ignore
      if (typeof res.flush === "function") res.flush();
      offset += rows.length;
      if (rows.length < BATCH_SIZE) break;
    }

    res.end();
    console.log(`Exported ${rowCount} rows to CSV`);
  } catch (err: any) {
    console.error({ err });
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * Generate a random ID.
 */
function generateId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 10; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Add a new email.
 */
export const addNewEmail = async (req: Request, res: Response) => {
  try {
    const { sender, subject, body } = req.body;
    const newEmail = {
      sender,
      subject,
      body,
      createdAt: new Date(),
      updatedAt: new Date(),
      sId: generateId(),
      summary: "",
      category: "",
    };
    console.log({ newEmail });
    const summarisedEmail = await summarizeSingleEmail({
      body: newEmail.body,
      sender: newEmail.sender,
      subject: newEmail.subject,
    });

    console.log({ summarisedEmail });

    newEmail.summary = summarisedEmail.summary;
    newEmail.category = summarisedEmail.category;
    await db.insert(emails).values(newEmail);
    res.status(200).json({
      status: "ok",
      message: "Email added successfully",
      data: newEmail,
    });
  } catch (error) {
    console.error({ error });
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * It resummarize email body
 */
export const resummarizeEmail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    //@ts-ignore
    const emailArray = await db.select().from(emails).where(eq(emails.id, id));
    const email = emailArray?.[0];
    console.log({ email });
    if (!email) {
      return res.status(404).json({
        status: "error",
        message: "Email not found",
        data: null,
      });
    }

    const enhancedSummary = await enhanceSummary(
      email.summary?.toString() || email.body?.toString() || ""
    );
    await db
      .update(emails)
      .set({ summary: enhancedSummary })
      .where(eq(emails.id, email.id!));

    res.status(200).json({
      status: "ok",
      message: "Email resummarized successfully",
      data: enhancedSummary,
    });
  } catch (err: any) {
    console.error({ err });
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      data: null,
    });
  }
};

export const deleteEmail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    //@ts-ignore
    await db.delete(emails).where(eq(emails.id, id));
    return res.status(200).json({
      status: "ok",
      message: "Email deleted successfully",
      data: null,
    });
  } catch (err: any) {
    console.error({ err });
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      data: null,
    });
  }
};
/**
 * Upsert emails from mock data to the database.
 */
export const upsertEmails = async (): Promise<boolean> => {
  const dbEmails = await db.select().from(emails);
  let modifiedPayload = mockEmails.map((email) => ({
    sId: email.id,
    sender: email.sender,
    subject: email.subject,
    body: email.body,
    sumary: "",
    category: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  if (dbEmails.length === 0) {
    const summarisedEmails = await summarizeBulkEmail(
      modifiedPayload.map((e) => {
        return {
          sId: e.sId,
          sender: e.sender,
          subject: e.subject,
          body: e.body,
        };
      })
    );
    modifiedPayload = modifiedPayload.map((e) => {
      const summarisedEmail = summarisedEmails.find(
        (s: { sId: string }) => s.sId === e.sId
      );
      return {
        ...e,
        summary: summarisedEmail?.summary,
        category: summarisedEmail?.category,
      };
    });
    console.log({ summarisedEmails });
    await db.insert(emails).values(modifiedPayload);
    console.log("Emails inserted successfully");
    return true;
  }

  await Promise.all(
    modifiedPayload.map(async (email) => {
      const allreadyExists = dbEmails.find((e) => e.sId === email.sId);
      if (!allreadyExists) {
        const summarisedEmail = await summarizeSingleEmail(email);
        console.log({ summarisedSingleEmail: summarisedEmail });
        const newEmail = {
          ...email,
          summary: summarisedEmail.summary,
          category: summarisedEmail.category,
        };
        await db.insert(emails).values(newEmail);
      }
    })
  );
  console.log("Emails updated successfully");
  return true;
};
