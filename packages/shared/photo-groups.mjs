/** Expiry stops new contributions; it never deletes membership history or photos. */
export const PHOTO_GROUP_DAYS = [1, 3, 7];
export function photoGroupIsActive(group, at = Date.now()) {
  return !!group && !group.endedAt && !!group.expiresAt && Date.parse(group.expiresAt) > at;
}
export function canPostToPhotoGroup(group, at = Date.now()) {
  return photoGroupIsActive(group, at) && group.canPost === true;
}
