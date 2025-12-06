import { apiRequest } from "@/lib/queryClient";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}

export async function createNotification({
  userId,
  title,
  message,
  type,
  link,
}: CreateNotificationParams) {
  try {
    await apiRequest("/api/notifications", {
      method: "POST",
      body: JSON.stringify({ userId, title, message, type, link }),
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

export async function createNotificationForUser(
  userId: string,
  title: string,
  message: string,
  type: string,
  link?: string
) {
  await createNotification({ userId, title, message, type, link });
}
