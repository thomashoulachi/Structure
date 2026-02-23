import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.focusItem.findMany({
    where: { userId },
    orderBy: { orderIndex: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();

  const maxOrder = await prisma.focusItem.aggregate({
    where: { userId },
    _max: { orderIndex: true },
  });

  const item = await prisma.focusItem.create({
    data: {
      userId,
      text: text || "",
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
  });
  return NextResponse.json(item);
}

export async function PUT(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, text, reorder } = await req.json();

  if (reorder) {
    // reorder is an array of { id, orderIndex }
    for (const item of reorder) {
      await prisma.focusItem.updateMany({
        where: { id: item.id, userId },
        data: { orderIndex: item.orderIndex },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (id && text !== undefined) {
    await prisma.focusItem.updateMany({
      where: { id, userId },
      data: { text },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}

export async function DELETE(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.focusItem.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
