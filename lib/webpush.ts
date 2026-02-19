import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function getBaseUrl() {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function ensureConfigured() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(`mailto:admin@barbearia.local`, publicKey, privateKey);
    configured = true;
  }
  return true;
}

export function getWebPushPublicKey() {
  return process.env.WEB_PUSH_PUBLIC_KEY ?? "";
}

export function canUseWebPush() {
  return ensureConfigured();
}

export async function sendBarberPushNotification(
  barberUserId: string,
  payload: { title: string; body: string; url?: string },
) {
  if (!ensureConfigured()) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: barberUserId },
  });
  if (subs.length === 0) return;

  const baseUrl = getBaseUrl();
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? `${baseUrl}/dashboard/agenda`,
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
      );
    } catch (error: any) {
      const statusCode = Number(error?.statusCode ?? 0);
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
      }
    }
  }
}
