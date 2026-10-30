import { readFileSync } from "fs";
import { pool } from "./db.js";

// Recreates the tables and loads the recipe dataset. WARNING: wipes existing data.
await pool.query(readFileSync("schema.sql", "utf8"));
await pool.query(readFileSync("seed.sql", "utf8"));
console.log("Database initialised");
await pool.end();
