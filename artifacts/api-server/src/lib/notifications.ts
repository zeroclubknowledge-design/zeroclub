import { db } from "@workspace/db";
import { profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
}

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!pushToken || !pushToken.startsWith("ExponentPushToken[")) return;
  const message: PushMessage = { to: pushToken, title, body, sound: "default", data: data ?? {} };
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!res.ok) logger.warn({ status: res.status }, "push notification failed");
  } catch (err) {
    logger.warn({ err }, "push notification send error");
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const profiles = await db
      .select({ pushToken: profilesTable.pushToken })
      .from(profilesTable)
      .where(eq(profilesTable.id, userId))
      .limit(1);
    const token = profiles[0]?.pushToken;
    if (token) await sendPushNotification(token, title, body, data);
  } catch (err) {
    logger.warn({ err }, "sendPushToUser error");
  }
}
