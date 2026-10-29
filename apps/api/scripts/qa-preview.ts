// Disposable preview environment for browser QA. It never touches tellme data.
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { serve } from "@hono/node-server";
const database = `tellme_ui_${randomUUID().slice(0, 8)}`;
process.env.MONGODB_DB = database;
process.env.PORT = "4101";
process.env.WEB_ORIGINS = "http://127.0.0.1:4102";
process.env.NODE_ENV = "test";
const { app } = await import("../src/app.js");
const db = await import("../src/backend/database.js");
const { hashPassword } = await import("../src/backend/security.js");
const { defaults } = await import("../src/backend/models.js");
const { day } = await import("../src/backend/domain.js");
await db.connectDatabase();
const password = `Tellme-qa-${randomUUID()}`;
const hash = await hashPassword(password),
  ids = [randomUUID(), randomUUID(), randomUUID()];
const photo = "/images/photo-1441974231531-c6227db76b6e.jpg";
const user = (
  index: number,
  name: string,
  username: string,
  avatar: string,
) => ({
  _id: ids[index]!,
  email: `${username}@example.invalid`,
  passwordHash: hash,
  username,
  name,
  avatar,
  cover: photo,
  bio: "Một chút cà phê, một chút thiên nhiên và thật nhiều câu chuyện.",
  location: "TP. Hồ Chí Minh",
  following: ids.filter((id) => id !== ids[index]),
  blocked: [],
  hiddenPosts: [],
  settings: { ...defaults },
  createdAt: new Date().toISOString(),
});
await db.users.insertMany([
  user(
    0,
    "Minh An",
    "minhan-qa",
    "/images/photo-1534528741775-53994a69daeb-avatar.jpg",
  ),
  user(
    1,
    "Linh Nguyễn",
    "linhnguyen-qa",
    "/images/photo-1494790108377-be9c29b29330-avatar.jpg",
  ),
  user(
    2,
    "Mai Anh",
    "maianh-qa",
    "/images/photo-1517841905240-472988babdf9-avatar.jpg",
  ),
]);
const postId = randomUUID();
await db.posts.insertOne({
  _id: postId,
  authorId: ids[1]!,
  content: "Đi chậm lại một chút để lắng nghe ngày của mình.",
  image: photo,
  topic: "Chuyện mỗi ngày",
  privacy: "public",
  anonymous: false,
  createdAt: new Date().toISOString(),
  reactions: { [ids[2]!]: "love" },
  comments: [],
  savedBy: [],
  sharedBy: [],
});
await db.stories.insertOne({
  _id: randomUUID(),
  userId: ids[1]!,
  day: day(),
  privacy: "public",
  updatedAt: new Date().toISOString(),
  items: [
    {
      id: randomUUID(),
      image: photo,
      caption: "Một khoảng lặng giữa ngày.",
      at: new Date(Date.now() - 3600000).toISOString(),
      reactions: {},
    },
    {
      id: randomUUID(),
      image: "/images/photo-1476514525535-07fb3b4ae5f1.jpg",
      caption: "Cùng nhau đi qua một ngày bình thường.",
      at: new Date().toISOString(),
      reactions: {},
    },
  ],
});
await writeFile(
  "/tmp/tellme-ui-qa.json",
  JSON.stringify({
    email: "minhan-qa@example.invalid",
    password,
    username: "minhan-qa",
    profile: "linhnguyen-qa",
    postId,
  }),
  { mode: 0o600 },
);
const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 4101 });
console.log("Isolated QA API ready on 4101");
const cleanup = () =>
  server.close(() => {
    void (async () => {
      const { v2: cloudinary } = await import("cloudinary");
      for (const item of await db.media
        .find({ ownerId: { $in: ids } })
        .toArray())
        await cloudinary.uploader.destroy(item._id);
      if (!database.startsWith("tellme_ui_"))
        throw new Error("Invalid QA database");
      await db.mongo.db(database).dropDatabase();
      await db.mongo.close();
      process.exit(0);
    })();
  });
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
