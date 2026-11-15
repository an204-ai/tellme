export const PHOTO_GROUP_DAYS: readonly [1, 3, 7];
export function photoGroupIsActive(group: { endedAt?: string; expiresAt?: string } | null | undefined, at?: number): boolean;
export function canPostToPhotoGroup(group: { endedAt?: string; expiresAt?: string; canPost?: boolean } | null | undefined, at?: number): boolean;
