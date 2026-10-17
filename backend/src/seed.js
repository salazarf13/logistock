import "dotenv/config";
import { initDb, closeDb } from "./db.js";
import { seedIfEmpty } from "./services.js";

initDb()
  .then(() => seedIfEmpty())
  .then((seeded) => {
    console.log(seeded ? "Seed completado." : "La base ya tenía usuarios; no se duplicó el seed.");
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
