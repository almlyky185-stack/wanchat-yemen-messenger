// Auto-generated from your database schema — do not edit by hand.
// Regenerates automatically whenever a table is created or altered.

export type UsersRow = {
  id: string
  email: string
  emailVerified: number | string | null
  displayName: string | null
  avatarUrl: string | null
  phone: string | null
  phoneVerified: number | string | null
  role: string | null
  metadata: string | null
  createdAt: string
  updatedAt: string
  lastSignIn: string
}

export type WanchatConsentsRow = {
  id: string
  userId: string
  policyVersion: string
  acceptedAt: string
  language: string
}

export type WanchatMessagesRow = {
  id: string
  userId: string
  roomId: string
  body: string
  createdAt: string
}

export type WanchatProfilesRow = {
  id: string
  userId: string
  displayName: string
  language: string
  createdAt: string
  bio: string | null
  avatarUrl: string | null
}

export type WanchatStatusesRow = {
  id: string
  userId: string
  body: string
  createdAt: string
  expiresAt: string
}
