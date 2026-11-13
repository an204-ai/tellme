/** Optional integration check. Uses and drops only its own random test database, never the configured app database. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { allocateMemberNumber, initializeMemberNumbers } from "../src/member-number.js";

if (!process.env.TEST_MONGODB_URI) throw new Error("Provide TEST_MONGODB_URI for the isolated member-number integration check.");
const client = new MongoClient(process.env.TEST_MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const databaseName = `tellme_members_test_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
const db = client.db(databaseName);
try {
  await client.connect();
  const people = db.collection("users"), counters = db.collection<{ _id: string; value: number }>("system_counters");
  await people.createIndex({ email: 1 }, { unique: true, sparse: true });
  await people.createIndex({ memberNumber: 1 }, { unique: true, partialFilterExpression: { memberNumber: { $type: "number" } } });
  await counters.insertOne({ _id: "account-creation", value: 98 });
  const create = async (id: string, email = `${id}@example.test`) => {
    const session = client.startSession();
    try { return await session.withTransaction(async () => {
      const memberNumber = await allocateMemberNumber(db, session);
      await people.insertOne({ _id: id, email, memberNumber } as never, { session }); return memberNumber;
    }); } finally { await session.endSession(); }
  };
  const numbers = await Promise.all([0, 1, 2, 3, 4].map(n => create(`member-${n}`)));
  assert.deepEqual([...numbers].sort((a, b) => a - b), [99, 100, 101, 102, 103]);
  assert.equal(numbers.filter(n => n <= 100).length, 2, "Concurrent registration cannot overfill the first 100");
  await people.deleteOne({ memberNumber: 100 });
  assert.equal(await create("after-deletion"), 104, "Deletion cannot make a founding place available again");
  await assert.rejects(create("duplicate", "after-deletion@example.test"));
  assert.equal(await create("after-failure"), 105, "Failed account creation must roll its number back");
  await people.deleteMany({}); await counters.deleteMany({});
  const history = [1, 2, 3].map(n => ({ _id: `legacy-${n}`, createdAt: `2026-01-0${n}T00:00:00.000Z` }));
  await people.insertMany([history[0]!, history[2]!] as never);
  const first = await initializeMemberNumbers(client, db, history);
  assert.deepEqual(first, { assigned: 2, reserved: 1, totalCreated: 3 });
  assert.deepEqual((await people.find().sort({ createdAt: 1 }).toArray()).map(p => p.memberNumber), [1, 3]);
  assert.deepEqual(await initializeMemberNumbers(client, db, history), { assigned: 0, reserved: 0, totalCreated: 3 });
  assert.equal(await create("new-after-history"), 4);
  console.log("PASS: concurrent quota boundary, deletion, transaction rollback, historical places and idempotent backfill.");
} finally {
  assert(databaseName.startsWith("tellme_members_test_"));
  try { await db.dropDatabase(); } finally { await client.close(); }
}
