import { Router } from "express";
import { prisma } from "../db/client";
import { getDefaultUser } from "../db/defaultUser";
import { asyncHandler } from "./asyncHandler";

export const devicesRouter = Router();

devicesRouter.post("/", asyncHandler(async (req, res) => {
  const token = String(req.body?.token ?? "").trim();
  const platform = String(req.body?.platform ?? "").trim();
  if (!token || !platform) {
    return res.status(400).json({ error: "token and platform are required" });
  }

  const user = await getDefaultUser();

  const pushToken = await prisma.pushToken.upsert({
    where: { userId_token: { userId: user.id, token } },
    update: { platform },
    create: { userId: user.id, token, platform },
  });

  res.status(201).json(pushToken);
}));
