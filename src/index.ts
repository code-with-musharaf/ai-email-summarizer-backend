import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { makeConnection } from "./db";
import routes from "./routes";
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());
makeConnection();

app.get("/", (req: Request, res: Response) => {
  res.send("Hello TypeScript + Express!");
});
app.use("/api/v1", routes);
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
