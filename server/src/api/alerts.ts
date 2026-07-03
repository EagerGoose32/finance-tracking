import { Router } from "express";
import { prisma } from "../db/client";
import { getDefaultUser } from "../db/defaultUser";
import { asyncHandler } from "./asyncHandler";

export const alertsRouter = Router();

alertsRouter.get("/", asyncHandler(async (req, res) => {
  const user = await getDefaultUser();
  const unreadOnly = req.query.unread === "true";

  const alerts = await prisma.alert.findMany({
    where: { userId: user.id, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
  });

  res.json(alerts);
}));

alertsRouter.post("/:id/read", asyncHandler(async (req, res) => {
  const alert = await prisma.alert.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  res.json(alert);
}));
