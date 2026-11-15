import type { PhotoGroup } from "./types";
import type { PhotoMoment } from "@/components/app/MomentCard";

/** One stable feed slot per group; only its newest actual photo sets its place. */
export function photoGroupMoment(group: PhotoGroup): PhotoMoment | null {
  if (!group.latest || !group.count) return null;
  return { group, item: { ...group.latest, id: `photo-group:${group.id}` }, story: { id: `photo-group:${group.id}`, userId: group.latest.userId, day: group.latest.at.slice(0, 10), privacy: "private", items: [] }, person: group.latest.person };
}
export function mixPhotoFeed(personal: PhotoMoment[], groups: PhotoGroup[], pending?: PhotoMoment | null) {
  let albums = groups;
  if (pending?.group) {
    const current = groups.find((group) => group.id === pending.group!.id) || pending.group;
    const latest = { ...pending.item, groupId: current.id, userId: "me", person: pending.person };
    const next = { ...current, latest, count: current.count + Number(current.latest?.id !== latest.id) };
    albums = [next, ...groups.filter((group) => group.id !== next.id)];
  }
  const regular = pending && !pending.group ? [pending, ...personal.filter((entry) => entry.item.id !== pending.item.id)] : personal;
  return [...regular, ...albums.map(photoGroupMoment).filter((entry): entry is PhotoMoment => !!entry)].sort((a, b) => b.item.at.localeCompare(a.item.at) || b.item.id.localeCompare(a.item.id));
}
