import express from "express";
import { emailController } from "./controller";

const router = express.Router();

router.get("/summaries", emailController.getEmailSummaries);
router.get("/summaries/count", emailController.getCountByCategroy);
router.get("/summaries/export", emailController.exportEmailsToCsv);
router.post("/summaries", emailController.addNewEmail);
router.post("/summaries/:id/resummarize", emailController.resummarizeEmail);
router.delete("/summaries/:id", emailController.deleteEmail);
export default router;
