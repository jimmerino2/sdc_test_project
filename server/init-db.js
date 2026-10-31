import { readFileSync } from "fs";
import { pool } from "./db.js";

// Recreates the tables and loads the food bank data. WARNING: wipes existing data.
await pool.query(readFileSync("schema.sql", "utf8"));
await pool.query(readFileSync("seed.sql", "utf8"));
console.log("Database initialised");
await pool.end();
