export type Entitlement = {
  courseId: string;
  features: string[];
  expiresAt: string | null;
};

export type AccountSession = {
  schemaVersion: 1;
  userId: string;
  displayName: string;
  accessExpiresAt: string;
  offlineGraceExpiresAt: string;
  entitlements: Entitlement[];
};

export type AuthorizationCallback = { code: string; state: string };
