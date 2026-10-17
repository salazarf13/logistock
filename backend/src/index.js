import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb } from "./db.js";
import { seedIfEmpty } from "./services.js";
import router from "./routes.js";

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json({ limit: "2mb" }));
app.use("/api", router);

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "LogiStock API" }));

const port = Number(process.env.PORT) || 4000;

initDb()
  .then(() => seedIfEmpty())
  .then((seeded) => {
    if (seeded) console.log("Datos de demostración cargados.");
    app.listen(port, () => console.log(`LogiStock API en http://localhost:${port}`));
  })
  .catch((err) => {
    console.error("No se pudo iniciar la base de datos:", err.message);
    process.exit(1);
  });
