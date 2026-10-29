import type {
  AppData,
  Person,
  Post,
  DayStory,
  PostFilters,
  PostPage,
  ProfileActivityPage,
} from "./types";
import { validateImage } from "./images";
export { canView, visiblePosts } from "./visibility";
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
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "same-origin",
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại nhé.",
      0,
    );
  }
  const body = await response
    .json()
    .catch(() => ({ error: "Máy chủ chưa sẵn sàng. Bạn thử lại nhé." }));
  if (!response.ok)
    throw new ApiError(
      body.error || "Chưa xử lý được yêu cầu.",
      response.status,
    );
  return body as T;
}
const send = (path: string, method: string, body?: unknown) =>
  request(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
let metadata: AppData | undefined;
const loadedPosts = new Map<string, Post>();
const loadedStories = new Map<string, DayStory>();
const knownPeople = new Map<string, Person>();
let queue: Promise<unknown> = Promise.resolve();
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const acceptPosts = (items: Post[]) =>
  items.forEach((item) => loadedPosts.set(item.id, item));
function overview(): AppData {
  if (!metadata) throw new Error("Chưa tải xong tài khoản.");
  return structuredClone({
    ...metadata,
    people: [...knownPeople.values()],
    posts: [],
    stories: [...loadedStories.values()],
  });
}
async function refresh() {
  const next = await request<AppData>("/bootstrap");
  metadata = next;
  next.people.forEach((p) => knownPeople.set(p.id, p));
  loadedStories.clear();
  next.stories.forEach((story) => loadedStories.set(story.id, story));
  return overview();
}
export const apiRepository = {
  async get() {
    return refresh();
  },
  snapshot() {
    return overview();
  },
  clear() {
    metadata = undefined;
    loadedPosts.clear();
    loadedStories.clear();
    knownPeople.clear();
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
  async getPost(id: string) {
    try {
      const post = await request<Post>(`/posts/${id}`);
      loadedPosts.set(id, post);
      return post;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        loadedPosts.delete(id);
        return null;
      }
      throw error;
    }
  },
  async getPostsPage(
    filters: PostFilters,
    cursor = 0,
    limit = 6,
  ): Promise<PostPage> {
    const params = new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined),
      ),
      cursor: String(cursor),
      limit: String(limit),
    });
    const page = await request<PostPage & { people: Person[] }>(
      `/posts?${params}`,
    );
    acceptPosts(page.items);
    page.people.forEach((p) => knownPeople.set(p.id, p));
    return { ...page, nextCursor: page.nextCursor ?? undefined };
  },
  async getProfilePage(
    authorId: string,
    cursor = 0,
    limit = 6,
  ): Promise<ProfileActivityPage> {
    const page = await request<ProfileActivityPage>(
      `/users/${authorId}/activity?cursor=${cursor}&limit=${limit}`,
    );
    page.items.forEach((item) =>
      item.kind === "post"
        ? loadedPosts.set(item.post.id, item.post)
        : loadedStories.set(item.story.id, item.story),
    );
    return { ...page, nextCursor: page.nextCursor ?? undefined };
  },
  async update(change: (draft: AppData) => void): Promise<AppData> {
    // The UI keeps its draft ergonomics. Only narrow REST commands cross the wire;
    // the server derives the actor from the session and checks each permission.
    const run = async () => {
      if (!metadata) await refresh();
      const before = { ...overview(), posts: [...loadedPosts.values()] };
      const draft = structuredClone(before);
      change(draft);
      const operations: (() => Promise<unknown>)[] = [];
      const affected = new Set<string>();
      const command = (path: string, method: string, body?: unknown) =>
        operations.push(() => send(path, method, body));
      const me = draft.people.find((p) => p.id === "me"),
        oldMe = before.people.find((p) => p.id === "me");
      if (me && oldMe && !equal(me, oldMe)) command("/users/me", "PATCH", me);
      if (!equal(draft.settings, before.settings))
        command("/users/me/settings", "PUT", draft.settings);
      for (const field of ["following", "blocked"] as const) {
        for (const id of new Set([...draft[field], ...before[field]])) {
          const active = draft[field].includes(id);
          if (active !== before[field].includes(id))
            command(
              `/users/${id}/${field === "following" ? "follow" : "block"}`,
              "PUT",
              { [field === "following" ? "following" : "blocked"]: active },
            );
        }
      }
      if (before.hiddenPosts.length && !draft.hiddenPosts.length)
        command("/users/me/hidden-posts", "DELETE");
      for (const id of draft.hiddenPosts.filter(
        (id) => !before.hiddenPosts.includes(id),
      ))
        command(`/posts/${id}/hidden`, "PUT");
      for (const report of draft.reports.filter(
        (r) => !before.reports.some((old) => equal(old, r)),
      ))
        command(`/posts/${report.postId}/report`, "POST", {
          reason: report.reason,
        });
      for (const post of draft.posts) {
        const old = before.posts.find((p) => p.id === post.id);
        if (!old) {
          command("/posts", "POST", post);
          affected.add(post.id);
          continue;
        }
        if (post.reaction !== old.reaction) {
          command(`/posts/${post.id}/reaction`, "PUT", {
            reaction: post.reaction,
          });
          affected.add(post.id);
        }
        if (post.saved !== old.saved) {
          command(`/posts/${post.id}/saved`, "PUT", { saved: post.saved });
          affected.add(post.id);
        }
        if (post.shares !== old.shares) {
          command(`/posts/${post.id}/share`, "POST");
          affected.add(post.id);
        }
        for (const comment of post.comments) {
          const previous = old.comments.find((c) => c.id === comment.id);
          if (!previous) {
            command(`/posts/${post.id}/comments`, "POST", comment);
            affected.add(post.id);
          } else if (comment.liked !== previous.liked) {
            command(`/posts/${post.id}/comments/${comment.id}/liked`, "PUT", {
              liked: !!comment.liked,
            });
            affected.add(post.id);
          }
        }
      }
      for (const post of before.posts.filter(
        (p) => !draft.posts.some((n) => n.id === p.id),
      )) {
        command(`/posts/${post.id}`, "DELETE");
        affected.add(post.id);
      }
      for (const story of draft.stories) {
        const old = before.stories.find((s) => s.id === story.id);
        for (const item of story.items) {
          const previous = old?.items.find((i) => i.id === item.id);
          if (!previous)
            command("/stories/moments", "POST", {
              ...item,
              storyId: story.id,
              privacy: story.privacy,
            });
          else if (item.reaction !== previous.reaction)
            command(`/stories/${story.id}/moments/${item.id}/reaction`, "PUT", {
              reaction: item.reaction || null,
            });
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
              message,
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
      try {
        for (const operation of operations) await operation();
      } finally {
        await Promise.all([...affected].map((id) => apiRepository.getPost(id)));
      }
      return refresh();
    };
    const result = queue.then(run, run);
    queue = result.catch(() => undefined);
    return result;
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
