import "dotenv/config"; // MUST be first import — loads .env before anything else runs
import express from "express";
import cors from "cors";
import authRoutes from "./module/users/user.route.js";
import bpRoutes from "./module/BP/bp.routes.js";
import bsRoutes from "./module/BS/bs.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;
const frontendOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

// ─── Middleware ──────────────────────────────
app.use(cors({ origin: frontendOrigins, credentials: true }));
app.use(express.json()); // parses incoming JSON request bodies

// ─── Routes ──────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/bp", bpRoutes);
app.use("/api/bs", bsRoutes);

// ─── Health check (optional but useful) ──────
app.get("/", (req, res) => {
  res.send("Lifelogix API is running");
});

// ─── Start server ────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});