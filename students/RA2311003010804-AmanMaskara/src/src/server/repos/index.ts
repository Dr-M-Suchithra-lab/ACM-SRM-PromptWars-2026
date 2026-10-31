import type { Repos } from "./types";
import { createMemoryRepos } from "./memory";
import { createMongoRepos } from "./mongo";

let repos: Repos | null = null;

/** MongoDB when MONGODB_URI is set (production / Vercel); deterministic in-memory seed otherwise. */
export function getRepos(): Repos {
  repos ??= process.env.MONGODB_URI ? createMongoRepos() : createMemoryRepos();
  return repos;
}
