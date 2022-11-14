import path from "path";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import customConfig from "./config/default";
import { inferAsyncReturnType, initTRPC } from "@trpc/server";
import { pool } from "./config/dbconnection";

dotenv.config({ path: path.join(__dirname, "./.env") });

const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({ req, res });

export type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create();
const appRouter = t.router({
  get: t.procedure
  .query(async () => {
    const result = await pool.query('SELECT * FROM users ORDER BY id ASC');
    return result.rows;
  }),
  register: t.procedure
  .mutation(async (request) => {
    const name = request.rawInput.name;
    const email = request.rawInput.email;
    await pool.query('INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *', [name, email]);
    return "created successfully";
  })
});

export type AppRouter = typeof appRouter;

const app = express();
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

app.use(
  cors({
    origin: [customConfig.origin, "http://localhost:3000"],
    credentials: true,
  })
);
app.use(
  "/api",
  trpcExpress.createExpressMiddleware({
    router: appRouter
  })
);

const port = customConfig.port;
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
