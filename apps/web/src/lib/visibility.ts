import type {
  AppData,
  Post,
  PostFilters,
  PostPage,
  Privacy,
  ProfileActivity,
  ProfileActivityPage,
} from "./types";

export function canView(
  authorId: string,
  privacy: Privacy,
  data: Pick<AppData, "blocked" | "connections">,
) {
  return (
    !data.blocked.includes(authorId) &&
    (authorId === "me" ||
      privacy === "public" ||
      (privacy === "connections" && data.connections.includes(authorId)))
  );
}
export const visiblePosts = (
  data: Pick<AppData, "posts" | "blocked" | "connections" | "hiddenPosts">,
): Post[] =>
  data.posts.filter(
    (post) =>
      canView(post.authorId, post.privacy, data) &&
      !data.hiddenPosts.includes(post.id),
  );

export function postsPage(
  data: Pick<
    AppData,
    "posts" | "blocked" | "connections" | "hiddenPosts" | "following" | "people"
  >,
  filters: PostFilters,
  cursor = 0,
  limit = 6,
): PostPage {
  let posts = visiblePosts(data);
  if (filters.view === "saved") posts = posts.filter((post) => post.saved);
  if (filters.view === "profile")
    posts = posts.filter(
      (post) => post.authorId === filters.authorId && !post.anonymous,
    );
  if (filters.view === "search")
    posts = posts.filter((post) => post.privacy === "public");
  if (filters.topic)
    posts = posts.filter((post) => post.topic === filters.topic);
  if (filters.tab === "following")
    posts = posts.filter(
      (post) =>
        post.authorId === "me" || data.following.includes(post.authorId),
    );
  if (filters.search) {
    const q = filters.search.toLocaleLowerCase("vi");
    posts = posts.filter((post) =>
      `${post.content} ${post.topic} ${post.anonymous ? "" : data.people.find((person) => person.id === post.authorId)?.name}`
        .toLocaleLowerCase("vi")
        .includes(q),
    );
  }
  if (filters.tab === "recent")
    posts = [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const items = posts.slice(cursor, cursor + limit);
  return {
    items,
    nextCursor:
      cursor + items.length < posts.length ? cursor + items.length : undefined,
    total: posts.length,
  };
}

export function profileActivityPage(
  data: Pick<
    AppData,
    "posts" | "stories" | "blocked" | "connections" | "hiddenPosts"
  >,
  authorId: string,
  cursor = 0,
  limit = 6,
): ProfileActivityPage {
  const posts: ProfileActivity[] = visiblePosts(data)
    .filter((post) => post.authorId === authorId && !post.anonymous)
    .map((post) => ({
      kind: "post",
      id: `post-${post.id}`,
      at: post.createdAt,
      post,
    }));
  const days: ProfileActivity[] = data.stories
    .filter(
      (story) =>
        story.userId === authorId &&
        story.items.length > 0 &&
        canView(story.userId, story.privacy, data),
    )
    .map((story) => ({
      kind: "day",
      id: `day-${story.id}`,
      at: story.items.reduce(
        (latest, item) => (item.at > latest ? item.at : latest),
        "",
      ),
      story,
    }));
  const all = [...posts, ...days].sort(
    (a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id),
  );
  const items = all.slice(cursor, cursor + limit);
  return {
    items,
    total: all.length,
    nextCursor:
      cursor + items.length < all.length ? cursor + items.length : undefined,
  };
}
export function reactorIds(
  post: Post,
  data: Pick<AppData, "people" | "blocked">,
) {
  return [
    ...new Set([...(post.reactorIds || []), ...(post.reaction ? ["me"] : [])]),
  ].filter(
    (id) =>
      !data.blocked.includes(id) &&
      data.people.some((person) => person.id === id),
  );
}
