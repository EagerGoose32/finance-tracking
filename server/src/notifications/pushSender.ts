import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "../db/client";

const expo = new Expo();

export async function sendPendingAlertPushes(): Promise<void> {
  const pendingAlerts = await prisma.alert.findMany({
    where: { sentAt: null },
    include: { user: { include: { pushTokens: true } }, company: true },
  });

  if (pendingAlerts.length === 0) return;

  const messages: ExpoPushMessage[] = [];
  const alertIdsByToken: string[] = [];

  for (const alert of pendingAlerts) {
    for (const pushToken of alert.user.pushTokens) {
      if (!Expo.isExpoPushToken(pushToken.token)) continue;

      messages.push({
        to: pushToken.token,
        sound: "default",
        title: alert.title,
        body: alert.message,
        data: { alertId: alert.id, companyId: alert.companyId, alertType: alert.alertType },
      });
      alertIdsByToken.push(alert.id);
    }
  }

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error("Failed to send push notification chunk:", err);
    }
  }

  await prisma.alert.updateMany({
    where: { id: { in: pendingAlerts.map((a) => a.id) } },
    data: { sentAt: new Date() },
  });
}
