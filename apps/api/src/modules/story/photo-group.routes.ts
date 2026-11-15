import type { Hono } from "hono";
import { z } from "zod";
import { photoGroupIsActive } from "@tellme/shared/photo-groups";
import { photoGroups, groupPhotos, users, mongo } from "../../backend/database.js";
import type { GroupPhoto, User } from "../../backend/models.js";
import { fail, type Env } from "../../backend/security.js";
import { externalId, internalId, now, personDTO, relations } from "../../backend/domain.js";
import { idSchema, momentCaptionSchema } from "../../backend/validation.js";
import { DEFAULT_GROUP_AVATAR, isGroupAvatarPreset } from "../../backend/social-assets.js";
import { publishUpdate, scheduleCleanup, withMediaChange } from "@tellme/database";
import { photoGroupVisibility } from "../../backend/photo-group-access.js";

export async function requirePhotoGroup(id: string, me: User) {
  const r = await relations(me);
  const group = await photoGroups.findOne({ _id: id, ...photoGroupVisibility(me._id, r) });
  if (!group) fail(404, "Nhóm ảnh không khả dụng.");
  return group;
}

async function publishGroupUpdate(memberIds: string[]) {
  const members = await users.find({ _id: { $in: memberIds } }, { projection: { _id: 1, following: 1 } }).toArray();
  const candidates = [...new Set(members.flatMap((member) => member.following))];
  const friends = candidates.length ? await users.find({ _id: { $in: candidates }, following: { $in: memberIds } }, { projection: { _id: 1 } }).toArray() : [];
  // Invalidation contains no group/photo data. Every subsequent read rechecks its audience.
  await publishUpdate([...new Set([...memberIds, ...friends.map((friend) => friend._id)])], "photo-groups");
}

async function photoDTOs(items: GroupPhoto[], me: User) {
  const authors = await users.find({ _id: { $in: [...new Set(items.map((p) => p.userId))] } }).toArray();
  const byId = new Map(authors.map((p) => [p._id, p]));
  return items.map(({ _id, ...item }) => ({ ...item, id: _id, userId: externalId(item.userId, me), person: byId.has(item.userId) ? personDTO(byId.get(item.userId)!, me, false) : undefined }));
}

export function registerPhotoGroupRoutes(api: Hono<Env>) {
  api.get("/photo-groups", async (c) => {
    const me = c.get("user"), r = await relations(me);
    const groups = await photoGroups.find({ memberIds: { $in: [me._id, ...r.mutual] } }).sort({ updatedAt: -1, _id: -1 }).toArray();
    const visible = groups.filter((group) => !group.memberIds.some((id) => r.blocked.includes(id)));
    const summaries = visible.length ? await groupPhotos.aggregate<{ _id: string; latest: GroupPhoto; count: number }>([
      { $match: { groupId: { $in: visible.map((g) => g._id) } } },
      { $sort: { at: -1, _id: -1 } },
      { $group: { _id: "$groupId", latest: { $first: "$$ROOT" }, count: { $sum: 1 } } },
    ]).toArray() : [];
    const latest = await photoDTOs(summaries.map((s) => s.latest), me);
    const members = visible.length ? await users.find({ _id: { $in: [...new Set(visible.flatMap((group) => group.memberIds))] } }).toArray() : [];
    const byMember = new Map(members.map((person) => [person._id, personDTO(person, me, false)]));
    const byGroup = new Map(summaries.map((s, i) => [s._id, { latest: latest[i], count: s.count }]));
    const busyGroups = await photoGroups.find({ activeMemberIds: { $in: r.mutual }, expiresAt: { $gt: now() }, endedAt: { $exists: false } }).toArray();
    const busyMemberIds = [...new Set(busyGroups.flatMap((group) => group.activeMemberIds || []).filter((id) => r.mutual.includes(id)))].map((id) => externalId(id, me));
    const pendingPeople = visible.some((g) => g.ownerId === me._id && g.pendingMemberIds?.length) ? await users.find({ _id: { $in: visible.filter((g) => g.ownerId === me._id).flatMap((g) => g.pendingMemberIds || []) } }).toArray() : [];
    const items = visible.map(({ _id, ownerId, memberIds, activeMemberIds, pendingMemberIds, ...group }) => ({ ...group, ...(ownerId === me._id ? { pendingMembers: photoGroupIsActive(group) ? pendingPeople.filter((p) => pendingMemberIds?.includes(p._id)).map((p) => personDTO(p, me, false)) : [] } : {}), id: _id, ownerId: externalId(ownerId, me), memberIds: memberIds.map((id) => externalId(id, me)), members: memberIds.flatMap((id) => byMember.has(id) ? [byMember.get(id)!] : []), isJoined: photoGroupIsActive(group) && !!activeMemberIds?.includes(me._id), canPost: photoGroupIsActive(group) && !!activeMemberIds?.includes(me._id), count: 0, ...byGroup.get(_id) }));
    // A blocked group exposes no photos/member identity, but must remain possible to end/leave.
    const unavailable = groups.filter((group) => !visible.includes(group) && photoGroupIsActive(group) && group.activeMemberIds?.includes(me._id)).map((group) => ({ id: group._id, title: "Nhóm không khả dụng", avatar: DEFAULT_GROUP_AVATAR, ownerId: externalId(group.ownerId, me), memberIds: ["me"], members: [], createdAt: group.createdAt, updatedAt: group.updatedAt, expiresAt: group.expiresAt, isJoined: true, canPost: false, count: 0 }));
    const invited = await photoGroups.find({ pendingMemberIds: me._id, expiresAt: { $gt: now() }, endedAt: { $exists: false } }).toArray();
    const owners = invited.length ? await users.find({ _id: { $in: invited.map((g) => g.ownerId) } }).toArray() : [];
    const invitations = invited.filter((g) => owners.some((p) => p._id === g.ownerId) && r.mutual.includes(g.ownerId) && !g.memberIds.some((id) => r.blocked.includes(id))).map((g) => ({ id: g._id, title: g.title, avatar: g.avatar, expiresAt: g.expiresAt!, owner: personDTO(owners.find((p) => p._id === g.ownerId)!, me, false) }));
    return c.json({ items: [...items, ...unavailable], busyMemberIds, invitations });
  });

  api.post("/photo-groups", async (c) => {
    const me = c.get("user");
    const input = z.object({ id: idSchema, title: z.string().trim().min(1).max(40), avatar: z.string().max(2000).refine((url) => isGroupAvatarPreset(url) || /^\/api\/media\/images\/[A-Za-z0-9_-]+$/.test(url)).default(DEFAULT_GROUP_AVATAR), memberIds: z.array(z.string().min(1).max(128)).min(1).max(29), durationDays: z.union([z.literal(1), z.literal(3), z.literal(7)]).default(1) }).strict().parse(await c.req.json());
    const existing = await photoGroups.findOne({ _id: input.id });
    if (existing) { if (existing.ownerId !== me._id) fail(409, "Nhóm đã tồn tại."); return c.json({ id: existing._id }, 201); }
    const r = await relations(me), memberIds = [...new Set(input.memberIds.map((id) => internalId(id, me)))].filter((id) => id !== me._id);
    if (!memberIds.length || memberIds.some((id) => !r.mutual.includes(id))) fail(403, "Chọn bạn bè đã kết nối để tạo nhóm.");
    const participants = [me._id, ...memberIds];
    const people = await users.find({ _id: { $in: participants } }).toArray();
    if (people.length !== participants.length || people.some((person) => person.blocked.some((id) => participants.includes(id)))) fail(403, "Có thành viên không khả dụng trong nhóm.");
    // A photo group is separate from a chat. Membership is never inferred from a photo URL.
    const at = now();
    // Expired reservations are released lazily before creation; history is never deleted.
    await photoGroups.updateMany({ activeMemberIds: me._id, expiresAt: { $lte: at } }, { $unset: { activeMemberIds: "" } });
    const occupied = await photoGroups.findOne({ activeMemberIds: me._id, expiresAt: { $gt: at }, endedAt: { $exists: false } });
    if (occupied) fail(409, "Bạn hoặc một người đã chọn đang ở nhóm khác. Hãy kết thúc hoặc rời nhóm đó trước.");
    const expiresAt = new Date(Date.parse(at) + input.durationDays * 86400000).toISOString();
    try {
      await withMediaChange(me, isGroupAvatarPreset(input.avatar) ? [] : [input.avatar], async (session) => { await photoGroups.insertOne({ _id: input.id, title: input.title, avatar: input.avatar, ownerId: me._id, memberIds: [me._id], activeMemberIds: [me._id], pendingMemberIds: memberIds, durationDays: input.durationDays, expiresAt, createdAt: at, updatedAt: at }, { session }); });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const retry = await photoGroups.findOne({ _id: input.id, ownerId: me._id });
      if (retry) return c.json({ id: retry._id }, 201);
      fail(409, "Một thành viên vừa tham gia nhóm khác. Chọn lại thành viên nhé.");
    }
    await publishUpdate(participants, "photo-groups");
    return c.json({ id: input.id }, 201);
  });

  api.post("/photo-groups/:id/invitations/accept", async (c) => {
    const me = c.get("user"), id = c.req.param("id");
    const group = await photoGroups.findOne({ _id: id });
    if (!group) fail(404, "Lời mời không còn khả dụng.");
    if (photoGroupIsActive(group) && group.activeMemberIds?.includes(me._id)) return c.json({ ok: true });
    if (!group.pendingMemberIds?.includes(me._id)) fail(404, "Lời mời không còn khả dụng.");
    if (!photoGroupIsActive(group)) fail(409, "Nhóm đã kết thúc.");
    const r = await relations(me);
    if (!r.mutual.includes(group.ownerId) || group.memberIds.some((id) => r.blocked.includes(id))) fail(403, "Lời mời không còn khả dụng.");
    const at = now();
    await photoGroups.updateMany({ activeMemberIds: me._id, expiresAt: { $lte: at } }, { $unset: { activeMemberIds: "" } });
    if (await photoGroups.findOne({ activeMemberIds: me._id, expiresAt: { $gt: at }, endedAt: { $exists: false } })) fail(409, "Bạn đang ở nhóm khác. Rời nhóm đó trước khi chấp nhận.");
    try {
      const result = await photoGroups.updateOne({ _id: id, pendingMemberIds: me._id, expiresAt: { $gt: at }, endedAt: { $exists: false }, $or: [{ memberIds: me._id }, { "memberIds.29": { $exists: false } }] }, { $addToSet: { memberIds: me._id, activeMemberIds: me._id }, $pull: { pendingMemberIds: me._id }, $set: { updatedAt: at } });
      if (!result.matchedCount) fail(409, "Lời mời đã thay đổi. Mở lại để kiểm tra nhé.");
    } catch (error) {
      if ((error as { code?: number }).code === 11000) fail(409, "Bạn vừa tham gia nhóm khác. Mỗi lúc chỉ tham gia một nhóm.");
      throw error;
    }
    await publishGroupUpdate([...group.memberIds, me._id]);
    return c.json({ ok: true });
  });
  api.post("/photo-groups/:id/invitations/decline", async (c) => {
    const me = c.get("user"), group = await photoGroups.findOne({ _id: c.req.param("id"), pendingMemberIds: me._id });
    if (!group) return c.json({ ok: true });
    await photoGroups.updateOne({ _id: group._id }, { $pull: { pendingMemberIds: me._id } });
    await publishUpdate([group.ownerId, me._id], "photo-groups");
    return c.json({ ok: true });
  });
  api.post("/photo-groups/:id/invitations", async (c) => {
    const me = c.get("user"), input = z.object({ memberIds: z.array(z.string().min(1).max(128)).min(1).max(29) }).strict().parse(await c.req.json());
    const group = await requirePhotoGroup(c.req.param("id"), me);
    if (group.ownerId !== me._id || !photoGroupIsActive(group)) fail(403, "Chỉ người tạo được mời bạn khi nhóm còn hoạt động.");
    const r = await relations(me), invitedIds = [...new Set(input.memberIds.map((id) => internalId(id, me)))].filter((id) => !group.activeMemberIds?.includes(id));
    if (invitedIds.some((id) => !r.mutual.includes(id))) fail(403, "Chọn bạn bè đã kết nối.");
    const invited = await users.find({ _id: { $in: invitedIds } }).toArray();
    if (invited.length !== invitedIds.length || invited.some((p) => p.blocked.some((id) => group.memberIds.includes(id)))) fail(403, "Có bạn không khả dụng.");
    const session = mongo.startSession();
    try { await session.withTransaction(async () => {
      const latest = await photoGroups.findOne({ _id: group._id, ownerId: me._id, endedAt: { $exists: false }, expiresAt: { $gt: now() } }, { session });
      if (!latest) fail(409, "Nhóm đã kết thúc.");
      const pending = [...new Set([...(latest.pendingMemberIds || []), ...invitedIds])].filter((id) => !latest.activeMemberIds?.includes(id));
      if (new Set([...latest.memberIds, ...pending]).size > 30) fail(409, "Nhóm tối đa 30 người, gồm cả lời mời đang chờ.");
      await photoGroups.updateOne({ _id: group._id }, { $set: { pendingMemberIds: pending } }, { session });
    }); } finally { await session.endSession(); }
    await publishUpdate([me._id, ...invitedIds], "photo-groups");
    return c.json({ ok: true });
  });
  api.patch("/photo-groups/:id/avatar", async (c) => {
    const me = c.get("user"), group = await requirePhotoGroup(c.req.param("id"), me);
    if (group.ownerId !== me._id || !photoGroupIsActive(group)) fail(403, "Chỉ người tạo được đổi ảnh nhóm đang hoạt động.");
    const { avatar } = z.object({ avatar: z.string().max(2000).refine((url) => isGroupAvatarPreset(url) || /^\/api\/media\/images\/[A-Za-z0-9_-]+$/.test(url)) }).strict().parse(await c.req.json());
    await withMediaChange(me, isGroupAvatarPreset(avatar) ? [] : [avatar], async (session) => {
      const result = await photoGroups.updateOne({ _id: group._id, ownerId: me._id, endedAt: { $exists: false }, expiresAt: { $gt: now() } }, { $set: { avatar } }, { session });
      if (!result.matchedCount) fail(409, "Nhóm đã kết thúc.");
      if (group.avatar !== avatar) await scheduleCleanup(me._id, [group.avatar], session);
    });
    await publishGroupUpdate([...group.memberIds, ...(group.pendingMemberIds || [])]);
    return c.json({ ok: true });
  });

  // Ending/ leaving releases posting reservations, preserving the original audience and stack.
  api.post("/photo-groups/:id/end", async (c) => {
    const me = c.get("user"), group = await photoGroups.findOne({ _id: c.req.param("id"), ownerId: me._id });
    if (!group) fail(404, "Chỉ người tạo mới được hủy nhóm.");
    await photoGroups.updateOne({ _id: group._id, ownerId: me._id, endedAt: { $exists: false } }, { $set: { endedAt: now(), endReason: "cancelled" }, $unset: { activeMemberIds: "", pendingMemberIds: "" } });
    await publishGroupUpdate(group.memberIds);
    if (group.pendingMemberIds?.length) await publishUpdate(group.pendingMemberIds, "photo-groups");
    return c.json({ ok: true });
  });
  api.post("/photo-groups/:id/leave", async (c) => {
    const me = c.get("user"), group = await photoGroups.findOne({ _id: c.req.param("id"), memberIds: me._id });
    if (!group) fail(404, "Nhóm ảnh không khả dụng.");
    if (group.ownerId === me._id && photoGroupIsActive(group)) fail(400, "Người tạo dùng Hủy nhóm để kết thúc cho cả nhóm.");
    if (photoGroupIsActive(group)) await photoGroups.updateOne({ _id: group._id }, { $pull: { activeMemberIds: me._id } });
    else await photoGroups.updateOne({ _id: group._id }, { $unset: { activeMemberIds: "" } });
    await publishGroupUpdate(group.memberIds);
    return c.json({ ok: true });
  });

  api.get("/photo-groups/:id/photos", async (c) => {
    const me = c.get("user"), group = await requirePhotoGroup(c.req.param("id"), me);
    let cursor: { at: string; id: string } | undefined;
    if (c.req.query("cursor")) {
      try { cursor = z.object({ at: z.string().datetime(), id: idSchema }).parse(JSON.parse(Buffer.from(c.req.query("cursor")!, "base64url").toString())); }
      catch { fail(400, "Mốc ảnh không hợp lệ."); }
    }
    const all = await groupPhotos.find({ groupId: group._id, ...(cursor ? { $or: [{ at: { $lt: cursor.at } }, { at: cursor.at, _id: { $lt: cursor.id } }] } : {}) }).sort({ at: -1, _id: -1 }).limit(21).toArray();
    const page = all.slice(0, 20), last = page.at(-1);
    return c.json({ items: await photoDTOs(page, me), nextCursor: all.length > 20 && last ? Buffer.from(JSON.stringify({ at: last.at, id: last._id })).toString("base64url") : null });
  });

  api.post("/photo-groups/:id/photos", async (c) => {
    const me = c.get("user"), group = await requirePhotoGroup(c.req.param("id"), me);
    const input = z.object({ id: idSchema, image: z.string().min(1).max(2000), caption: momentCaptionSchema }).strict().parse(await c.req.json());
    const existing = await groupPhotos.findOne({ _id: input.id });
    if (existing) {
      if (existing.groupId !== group._id || existing.userId !== me._id) fail(409, "Ảnh đã tồn tại.");
      return c.json({ ok: true }, 201);
    }
    if (!photoGroupIsActive(group) || !group.activeMemberIds?.includes(me._id)) fail(409, "Nhóm đã kết thúc hoặc bạn đã rời nhóm. Ảnh cũ vẫn được giữ.");
    await withMediaChange(me, [input.image], async (session) => {
      const current = await photoGroups.findOne({ _id: group._id, memberIds: me._id }, { session });
      if (!current) fail(404, "Nhóm ảnh không khả dụng.");
      if (!photoGroupIsActive(current) || !current.activeMemberIds?.includes(me._id)) fail(409, "Nhóm đã kết thúc hoặc bạn đã rời nhóm. Ảnh cũ vẫn được giữ.");
      const at = now();
      const result = await groupPhotos.updateOne({ _id: input.id, groupId: group._id, userId: me._id }, { $setOnInsert: { _id: input.id, groupId: group._id, userId: me._id, image: input.image, caption: input.caption, at } }, { upsert: true, session });
      if (result.upsertedCount) await photoGroups.updateOne({ _id: group._id }, { $set: { updatedAt: at } }, { session });
    });
    await publishGroupUpdate(group.memberIds);
    return c.json({ ok: true }, 201);
  });

  api.delete("/photo-groups/:id/photos/:photoId", async (c) => {
    const me = c.get("user"), group = await requirePhotoGroup(c.req.param("id"), me);
    const session = mongo.startSession();
    try { await session.withTransaction(async () => {
      const photo = await groupPhotos.findOne({ _id: c.req.param("photoId"), groupId: group._id, userId: me._id }, { session });
      if (!photo) fail(404, "Bạn chỉ có thể xóa ảnh mình đã đăng.");
      await groupPhotos.deleteOne({ _id: photo._id, userId: me._id }, { session });
      await scheduleCleanup(me._id, [photo.image], session);
      await photoGroups.updateOne({ _id: group._id }, { $set: { updatedAt: now() } }, { session });
    }); } finally { await session.endSession(); }
    await publishGroupUpdate(group.memberIds);
    return c.json({ ok: true });
  });
}
