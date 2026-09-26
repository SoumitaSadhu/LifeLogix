import "dotenv/config"; // MUST be first import — loads .env before anything else runs
import express from "express";
import cors from "cors";
import authRoutes from "./module/users/user.route.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────
app.use(cors());
app.use(express.json()); // parses incoming JSON request bodies

// ─── Routes ──────────────────────────────────
app.use("/api/auth", authRoutes);

// ─── Health check (optional but useful) ──────
app.get("/", (req, res) => {
  res.send("Lifelogix API is running");
});

// ─── Start server ────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});