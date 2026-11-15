import type {
  AppData,
  Person,
  DayStory,
  StoryPage,
  JourneyMonth,
  Reaction,
  Message,
  NotificationPage,
  Notice,
} from "./types";
import { validateImage } from "./images";
export { canView } from "./visibility";
export const newId = () => crypto.randomUUID();
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export async function request<T = { ok: boolean }>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timeout = !options.method || options.method.toUpperCase() === "GET"
    ? setTimeout(abort, 20000)
    : undefined;
  try {
    const response = await fetch(`/api${path}`, {
      ...options,
      signal: controller.signal,
      credentials: "same-origin",
      headers: {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });
    const body = await response.json().catch((error) => {
      if (controller.signal.aborted) throw error;
      throw new ApiError("Máy chủ chưa sẵn sàng. Bạn thử lại nhé.", response.status);
    });
    if (!response.ok) throw new ApiError(body?.error || "Chưa xử lý được yêu cầu.", response.status);
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw error;
    throw new ApiError(controller.signal.aborted
      ? "Máy chủ phản hồi quá lâu. Bạn thử lại nhé."
      : "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại nhé.", 0);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}
const send = (path: string, method: string, body?: unknown) =>
  request(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
let metadata: AppData | undefined;
const loadedStories = new Map<string, DayStory>();
const knownPeople = new Map<string, Person>();
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(run: () => Promise<T>): Promise<T> {
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
function overview(): AppData {
  if (!metadata) throw new Error("Chưa tải xong tài khoản.");
  return structuredClone({
    ...metadata,
    people: [...knownPeople.values()],
    stories: [...loadedStories.values()],
  });
}
async function refresh(signal?: AbortSignal) {
  const next = await request<AppData>("/bootstrap", { signal });
  metadata = next;
  knownPeople.clear();
  next.people.forEach((p) => knownPeople.set(p.id, p));
  loadedStories.clear();
  next.stories.forEach((story) => loadedStories.set(story.id, story));
  return overview();
}
export const apiRepository = {
  async get(signal?: AbortSignal) {
    return refresh(signal);
  },
  snapshot() {
    return overview();
  },
  peekStory(id: string) {
    return loadedStories.get(id);
  },
  reactToMoment(storyId: string, itemId: string, reaction: Reaction | null) {
    return (async () => {
      await send(`/stories/${storyId}/moments/${itemId}/reaction`, "PUT", { reaction });
      return apiRepository.getStory(storyId);
    })();
  },
  sendMessage(conversationId: string, message: Pick<Message, "id" | "text" | "stickerId"> & { replyToId?: string }) {
    return request<{ ok: boolean; message: Message }>(`/conversations/${encodeURIComponent(conversationId)}/messages`, { method: "POST", body: JSON.stringify(message) });
  },
  getNotificationsPage(scope: "recent" | "older", cursor = 0, limit = 20) {
    const query = new URLSearchParams({ scope, cursor: String(cursor), limit: String(limit) });
    return request<NotificationPage>(`/notifications/inbox?${query}`);
  },
  markNotificationGroupRead(notice: Notice) {
    if (notice.kind === "system") return send("/notifications/read", "PUT", { ids: [notice.id] });
    return send("/notifications/group-read", "PUT", {
      userId: notice.userId,
      kind: notice.kind || "like",
    });
  },
  markAllNotificationsRead() {
    return send("/notifications/read-all", "PUT");
  },
  clear() {
    metadata = undefined;
    loadedStories.clear();
    knownPeople.clear();
  },
  async getStoriesPage(cursor = 0, limit = 6, author?: string): Promise<StoryPage> {
    const params = new URLSearchParams({ cursor: String(cursor), limit: String(limit), ...(author ? { author } : {}) });
    const result = await request<{ items: DayStory[]; people: Person[]; nextCursor: number | null }>(`/stories?${params}`);
    result.people.forEach((person) => knownPeople.set(person.id, person));
    result.items.forEach((story) => loadedStories.set(story.id, story));
    return { items: result.items, nextCursor: result.nextCursor ?? undefined };
  },
  async getStory(id: string) {
    const story = await request<DayStory>(`/stories/${id}`);
    loadedStories.set(story.id, story);
    return story;
  },
  async getPerson(username: string) {
    const p = await request<Person>(`/users/${encodeURIComponent(username)}`);
    knownPeople.set(p.id, p);
    return p;
  },
  async getJourneyMonth(authorId: string, month: string): Promise<JourneyMonth> {
    return request<JourneyMonth>(`/users/${encodeURIComponent(authorId)}/journey?month=${encodeURIComponent(month)}`);
  },
  async update(change: (draft: AppData) => void): Promise<AppData> {
    // The UI keeps its draft ergonomics. Only narrow REST commands cross the wire;
    // the server derives the actor from the session and checks each permission.
    const run = async () => {
      if (!metadata) await refresh();
      const before = overview();
      const draft = structuredClone(before);
      change(draft);
      const operations: (() => Promise<unknown>)[] = [];
      const command = (path: string, method: string, body?: unknown) =>
        operations.push(() => send(path, method, body));
      const me = draft.people.find((p) => p.id === "me"),
        oldMe = before.people.find((p) => p.id === "me");
      if (me && oldMe && !equal(me, oldMe)) command("/users/me", "PATCH", me);
      if (!equal(draft.settings, before.settings))
        command("/users/me/settings", "PUT", draft.settings);
      for (const id of new Set([...draft.blocked, ...before.blocked])) {
        const blocked = draft.blocked.includes(id);
        if (blocked !== before.blocked.includes(id)) command(`/users/${id}/block`, "PUT", { blocked });
      }
      for (const story of draft.stories) {
        const old = before.stories.find((s) => s.id === story.id);
        for (const previous of old?.items || [])
          if (!story.items.some((item) => item.id === previous.id))
            command(`/stories/${story.id}/moments/${previous.id}`, "DELETE");
        for (const item of story.items) {
          const previous = old?.items.find((i) => i.id === item.id);
          if (!previous)
            command("/stories/moments", "POST", {
              ...item,
              storyId: story.id,
              storyPrivacy: story.privacy,
            });
          else {
            if (item.caption !== previous.caption)
              command(`/stories/${story.id}/moments/${item.id}`, "PATCH", {
                caption: item.caption,
              });
            if (item.reaction !== previous.reaction)
              command(`/stories/${story.id}/moments/${item.id}/reaction`, "PUT", {
                reaction: item.reaction || null,
              });
          }
        }
      }
      const aliases = new Map<string, string>();
      for (const chat of draft.conversations) {
        const old = before.conversations.find((c) => c.id === chat.id);
        if (!old)
          operations.push(async () => {
            const result = await request<{ id: string }>("/conversations", {
              method: "POST",
              body: JSON.stringify({
                id: chat.id,
                kind: chat.kind || "direct",
                title: chat.title || "",
                avatar: chat.avatar || "",
                participantIds:
                  chat.kind === "group" ? chat.participantIds : [chat.userId],
              }),
            });
            aliases.set(chat.id, result.id);
          });
        if (old?.unread && !chat.unread)
          command(`/conversations/${chat.id}/read`, "PUT");
        for (const message of chat.messages.filter(
          (m) => !old?.messages.some((p) => p.id === m.id),
        ))
          operations.push(() =>
            send(
              `/conversations/${aliases.get(chat.id) || chat.id}/messages`,
              "POST",
              {
                id: message.id,
                text: message.text,
                ...(message.stickerId ? { stickerId: message.stickerId } : {}),
                ...(message.storyReply ? { storyReply: { storyId: message.storyReply.storyId, momentId: message.storyReply.momentId } } : {}),
              },
            ),
          );
      }
      const read = draft.notifications
        .filter(
          (n) =>
            n.read &&
            !before.notifications.find((old) => old.id === n.id)?.read,
        )
        .map((n) => n.id);
      if (read.length) command("/notifications/read", "PUT", { ids: read });
      for (const operation of operations) await operation();
      return refresh();
    };
    return enqueue(run);
  },
};
export function timeAgo(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
  if (minutes < 43200) return `${Math.floor(minutes / 1440)} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "long",
  }).format(new Date(value));
}
export const timeOf = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
export async function readImage(file: File): Promise<string> {
  validateImage(file);
  const form = new FormData();
  form.set("file", file);
  const result = await request<{ url: string }>("/media/upload", {
    method: "POST",
    body: form,
  });
  return result.url;
}
