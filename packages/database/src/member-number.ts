import type { ClientSession, Db, MongoClient } from "mongodb";
import type { User } from "./models.js";

const counterId = "account-creation";
type Counter = { _id: string; value: number };

/** Run inside the same transaction that creates the account. Deleted numbers are never reused. */
export async function allocateMemberNumber(db: Db, session: ClientSession) {
  const counter = await db.collection<Counter>("system_counters").findOneAndUpdate(
    { _id: counterId }, { $inc: { value: 1 } }, { upsert: true, returnDocument: "after", session },
  );
  if (!counter || !Number.isSafeInteger(counter.value) || counter.value < 1) throw new Error("Could not assign account creation number.");
  return counter.value;
}

/** Idempotent legacy backfill. A supplied historical roster reserves deleted accounts' original places. */
export async function initializeMemberNumbers(client: MongoClient, db: Db, history: Pick<User, "_id" | "createdAt">[] = []) {
  const counters = db.collection<Counter>("system_counters"), users = db.collection<User>("users");
  try { await counters.updateOne({ _id: counterId }, { $setOnInsert: { value: 0 } }, { upsert: true }); }
  catch (error) { if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error; }
  const session = client.startSession();
  try {
    return await session.withTransaction(async () => {
      const counter = await counters.findOne({ _id: counterId }, { session });
      if (!counter) throw new Error("Account creation counter is unavailable.");
      const current = await users.find({ memberNumber: { $exists: false } }, { session, projection: { _id: 1, createdAt: 1, memberNumber: 1 } }).toArray();
      const latest = await users.find({ memberNumber: { $gte: 1 } }, { session, projection: { memberNumber: 1 } }).sort({ memberNumber: -1 }).limit(1).next();
      const maximum = Math.max(counter.value, latest?.memberNumber || 0);
      if (maximum !== counter.value) await counters.updateOne({ _id: counterId }, { $max: { value: maximum } }, { session });
      const roster = new Map(history.map(u => [u._id, u]));
      for (const user of current) roster.set(user._id, user);
      const ordered = [...roster.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a._id.localeCompare(b._id));
      let assigned = 0, reserved = 0;
      for (const entry of ordered) {
        const user = current.find(u => u._id === entry._id);
        if (user?.memberNumber || !user && maximum > 0) continue;
        const number = await allocateMemberNumber(db, session);
        if (user) { await users.updateOne({ _id: user._id, memberNumber: { $exists: false } }, { $set: { memberNumber: number } }, { session }); assigned++; }
        else reserved++;
      }
      return { assigned, reserved, totalCreated: (await counters.findOne({ _id: counterId }, { session }))!.value };
    });
  } finally { await session.endSession(); }
}
