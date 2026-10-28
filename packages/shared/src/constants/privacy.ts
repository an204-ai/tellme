export const PRIVACY_LEVELS = {
  PUBLIC: "public",
  CONNECTIONS: "connections",
  PRIVATE: "private"
} as const;

export type PrivacyLevel = (typeof PRIVACY_LEVELS)[keyof typeof PRIVACY_LEVELS];
