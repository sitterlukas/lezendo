export { default } from "./client"; // default export = the db client, so `import db from "@whipperbook/db"` works
export { default as db } from "./client";
export * from "@whipperbook/core"; // re-export core types+values so old `@/lib/db` imports resolve
export * from "./grade-data";
export * from "./points";
export * from "./credentials";
export * from "./api/tokens";
export * from "./deletion-log";
export * from "./feed-interactions";
export * from "./feed";
export * from "./validators";
export * from "./queries/crags";
export * from "./queries/sectors";
export * from "./queries/routes";
export * from "./queries/forum";
export * from "./queries/gear";
export * from "./queries/home";
export * from "./queries/leaderboards";
export * from "./queries/me";
export * from "./queries/reviews";
export * from "./queries/users";
export * from "./queries/admin";
export * from "./queries/feed-page";
export * from "./queries/notifications";
