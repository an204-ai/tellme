import { Hono } from "hono";
import { z } from "zod";
import { stories } from "../../backend/database.js";
import { fail, type Env } from "../../backend/security.js";
import {
  now,
  day,
  requireStory,
  storyDTO,
  ownedImage,
} from "../../backend/domain.js";
import * as v from "../../backend/validation.js";
export function registerStoryRoutes(api: Hono<Env>) {
  api.get("/stories/:id", async (c) =>
    c.json(
      storyDTO(
        await requireStory(c.req.param("id"), c.get("user")),
        c.get("user"),
      ),
    ),
  );
  api.post("/stories/moments", async (c) => {
    const me = c.get("user"),
      input = v.momentSchema.parse(await c.req.json());
    await ownedImage(input.image, me);
    const story = await stories.findOne({ userId: me._id, day: day() });
    if (story && story.items.length >= 50)
      fail(400, "Mỗi ngày tối đa 50 khoảnh khắc.");
    if (story) {
      await stories.updateOne(
        { _id: story._id, "items.id": { $ne: input.id } },
        {
          $set: { privacy: input.privacy, updatedAt: now() },
          $push: {
            items: {
              id: input.id,
              image: input.image,
              caption: input.caption,
              at: now(),
              reactions: {},
            },
          },
        },
      );
    } else
      await stories.insertOne({
        _id: input.storyId,
        userId: me._id,
        day: day(),
        privacy: input.privacy,
        updatedAt: now(),
        items: [
          {
            id: input.id,
            image: input.image,
            caption: input.caption,
            at: now(),
            reactions: {},
          },
        ],
      });
    return c.json({ ok: true }, 201);
  });
  api.put("/stories/:id/moments/:momentId/reaction", async (c) => {
    const me = c.get("user"),
      story = await requireStory(c.req.param("id"), me),
      momentId = c.req.param("momentId"),
      { reaction } = z
        .object({ reaction: v.reaction })
        .parse(await c.req.json());
    if (!story.items.some((i) => i.id === momentId))
      fail(404, "Khoảnh khắc không tồn tại.");
    await stories.updateOne(
      { _id: story._id, "items.id": momentId },
      reaction
        ? { $set: { [`items.$.reactions.${me._id}`]: reaction } }
        : { $unset: { [`items.$.reactions.${me._id}`]: "" } },
    );
    return c.json({ ok: true });
  });
}
