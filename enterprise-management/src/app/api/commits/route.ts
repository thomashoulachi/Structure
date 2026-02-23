import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId, description, timeSpentMinutes, completionPercentAfter } = await req.json();

  if (!taskId || !description?.trim() || !timeSpentMinutes || completionPercentAfter === undefined) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const commit = await prisma.commit.create({
    data: {
      userId,
      taskId,
      description: description.trim(),
      timeSpentMinutes,
      completionPercentAfter,
    },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { completionPercent: completionPercentAfter },
  });

  return NextResponse.json(commit);
}

export async function PUT(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, description, timeSpentMinutes, timestamp } = await req.json();

  if (!id) return NextResponse.json({ error: "Commit id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (description !== undefined) data.description = description.trim();
  if (timeSpentMinutes !== undefined) data.timeSpentMinutes = timeSpentMinutes;
  if (timestamp !== undefined) data.timestamp = new Date(timestamp);

  await prisma.commit.updateMany({
    where: { id, userId },
    data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.commit.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
