import { clerkClient } from "@clerk/express";

/**
 * Returns the current user's primary email address, or null if it cannot be
 * resolved. Used to activate pending workspace invites that were created
 * before the invitee had (or was matched to) a Clerk account.
 */
export async function getUserPrimaryEmail(
  userId: string,
): Promise<string | null> {
  const user = await clerkClient.users.getUser(userId);
  const primary = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId,
  );
  return (primary ?? user.emailAddresses[0])?.emailAddress?.toLowerCase() ?? null;
}
