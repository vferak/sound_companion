import { staticPlugin } from "@elysiajs/static";
import { Elysia } from "elysia";
import { rest } from "./rest";
import { websocket } from "./websocket";
import { playHistoryDb } from "./database";

const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .use(staticPlugin())
  .use(websocket)
  .use(rest)
  .listen(3700);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);

// Initialize database
console.log("🗄️ Database initialized and ready");
