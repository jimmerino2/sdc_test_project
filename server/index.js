import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { createHandler } from "graphql-http/lib/use/express";
import schema from "./schema.js";
import rootValue from "./resolvers.js";

if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
  console.error("DATABASE_URL and JWT_SECRET must be set (see .env.example)");
  process.exit(1);
}

// Optional auth: a valid bearer token identifies the user, anything else is anonymous.
// Resolvers that need a user reject anonymous callers themselves.
function context(req) {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    return { userId: jwt.verify(token, process.env.JWT_SECRET).id };
  } catch {
    return { userId: null };
  }
}

const app = express();
app.use(cors());
app.all("/graphql", createHandler({ schema, rootValue, context: (req) => context(req.raw) }));

app.listen(3001, () => console.log("GraphQL API on http://localhost:3001/graphql"));
