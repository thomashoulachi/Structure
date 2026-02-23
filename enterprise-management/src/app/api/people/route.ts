import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const people = await prisma.person.findMany({
    where: { userId },
    orderBy: { orderIndex: "asc" },
    include: { _count: { select: { tasks: true } } },
  });
  return NextResponse.json(people);
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const maxOrder = await prisma.person.aggregate({
    where: { userId },
    _max: { orderIndex: true },
  });

  const person = await prisma.person.create({
    data: {
      userId,
      name: name.trim(),
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
  });
  return NextResponse.json(person);
}

export async function PUT(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, reorder } = await req.json();

  if (reorder) {
    for (const item of reorder) {
      await prisma.person.updateMany({
        where: { id: item.id, userId },
        data: { orderIndex: item.orderIndex },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (id && name !== undefined) {
    await prisma.person.updateMany({
      where: { id, userId },
      data: { name: name.trim() },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}

export async function DELETE(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, replacementId } = await req.json();

  const person = await prisma.person.findFirst({ where: { id, userId } });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const taskCount = await prisma.task.count({ where: { assigneePersonId: id, userId } });

  if (taskCount > 0 && !replacementId) {
    return NextResponse.json(
      { error: "Person has tasks. Provide replacementId.", needsReplacement: true, taskCount },
      { status: 400 }
    );
  }

  if (taskCount > 0 && replacementId) {
    await prisma.task.updateMany({
      where: { assigneePersonId: id, userId },
      data: { assigneePersonId: replacementId },
    });
  }

  await prisma.person.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
