import express from "express";
import path from "path";
import PgBoss from "pg-boss";

import { loadApiEndpoints } from "./controllers/api";

// Create Express server
const app = express();

// Express configuration
app.set("port", process.env.PORT || 3000);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pgboss connection configuration
const pgBossHost = process.env.PGBOSSHOST || "localhost";
const pgBossPort = process.env.PGBOSSPORT || "5432";
const pgBossDatabase = process.env.PGBOSSDATABASE || "db_pgboss";
const pgBossUser = process.env.PGBOSSUSER || "pgboss";
const pgBossPassword = process.env.PGBOSSPASSWORD || "pgboss";

// Initialize pgboss
const boss = new PgBoss(`postgres://${pgBossUser}:${pgBossPassword}@${pgBossHost}:${pgBossPort}/${pgBossDatabase}`);
app.set("pgboss", boss);

app.use(
  express.static(path.join(__dirname, "../public"), { maxAge: 31557600000 })
);

loadApiEndpoints(app);

export default app;
