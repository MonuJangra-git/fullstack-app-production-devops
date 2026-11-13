import { eq } from "drizzle-orm";
import { db, user } from "@workspace/db";

/**
 * Returns the current user's primary email address, or null if it cannot be
 * resolved. Used to activate pending workspace invites that were created
 * before the invitee had an account.
 */
export async function getUserPrimaryEmail(
  userId: string,
): Promise<string | null> {
  const [account] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId));
  return account?.email.toLowerCase() ?? null;
}
