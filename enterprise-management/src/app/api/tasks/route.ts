import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { userId },
    include: {
      assignee: true,
      commits: {
        orderBy: { timestamp: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, assigneePersonId, rowStatus, completionPercent, dueDate } = await req.json();

  if (!title?.trim() || !assigneePersonId) {
    return NextResponse.json({ error: "Title and assignee required" }, { status: 400 });
  }

  const person = await prisma.person.findFirst({ where: { id: assigneePersonId, userId } });
  if (!person) return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });

  const task = await prisma.task.create({
    data: {
      userId,
      title: title.trim(),
      assigneePersonId,
      rowStatus: rowStatus || "CURRENT",
      completionPercent: completionPercent ?? 0,
      dueDate: dueDate || null,
    },
    include: { assignee: true, commits: true },
  });
  return NextResponse.json(task);
}

export async function PUT(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, title, assigneePersonId, rowStatus, completionPercent, dueDate } = await req.json();

  if (!id) return NextResponse.json({ error: "Task id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title.trim();
  if (assigneePersonId !== undefined) {
    const person = await prisma.person.findFirst({ where: { id: assigneePersonId, userId } });
    if (!person) return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
    data.assigneePersonId = assigneePersonId;
  }
  if (rowStatus !== undefined) data.rowStatus = rowStatus;
  if (completionPercent !== undefined) data.completionPercent = completionPercent;
  if (dueDate !== undefined) data.dueDate = dueDate || null;

  const task = await prisma.task.updateMany({
    where: { id, userId },
    data,
  });

  const updated = await prisma.task.findFirst({
    where: { id, userId },
    include: { assignee: true, commits: { orderBy: { timestamp: "desc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.commit.deleteMany({ where: { taskId: id, userId } });
  await prisma.task.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
