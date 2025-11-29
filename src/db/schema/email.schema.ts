import * as p from "drizzle-orm/pg-core";

export const emails = p.pgTable("emails", {
  id: p.serial(),
  sId: p.text("s_id"),
  subject: p.text("subject"),
  body: p.text("body"),
  sender: p.text("sender"),
  phoneNumber: p.text("phone_number"),
  createdAt: p.timestamp("created_at"),
  updatedAt: p.timestamp("updated_at"),
  deletedAt: p.timestamp("deleted_at"),
  summary: p.text("summary"),
  category: p.text("category"),
});
