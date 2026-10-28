import { createDbClient } from "@tellme/database";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/tellme_dev";
export const db = createDbClient(dbUrl);
