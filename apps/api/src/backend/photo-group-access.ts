import type { Filter } from "mongodb";
import type { PhotoGroup } from "./models.js";

/** Viewing is shared with accepted members and their mutual friends; posting is not. */
export function photoGroupVisibility(meId: string, relation: { mutual: string[]; blocked: string[] }): Filter<PhotoGroup> {
  return { memberIds: { $nin: relation.blocked }, $or: [{ memberIds: meId }, { memberIds: { $in: relation.mutual } }] };
}
