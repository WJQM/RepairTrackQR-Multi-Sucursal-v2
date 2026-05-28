import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const qBranchId = searchParams.get("branchId");

  if (code) {
    if (qBranchId) {
      const quotation = await prisma.quotation.findFirst({ where: { code, branchId: qBranchId }, include: { branch: { select: { id: true, name: true } } } });
      if (!quotation) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({ ...quotation, items: ((() => { try { return JSON.parse(quotation.items); } catch { return []; } })()) });
    }
    // Search across all branches
    const quotations = await prisma.quotation.findMany({ where: { code }, include: { branch: { select: { id: true, name: true } } } });
    if (quotations.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (quotations.length === 1) return NextResponse.json({ ...quotations[0], items: ((() => { try { return JSON.parse(quotations[0].items); } catch { return []; } })()) });
    // Multiple matches
    return NextResponse.json({ multiple: true, quotations: quotations.map(q => ({ ...q, items: ((() => { try { return JSON.parse(q.items); } catch { return []; } })()) })) });
  }

  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const branchId = getEffectiveBranchId(request, user);

  const where: any = {};
  if (branchId) where.branchId = branchId;

  const quotations = await prisma.quotation.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json(quotations.map(q => ({ ...q, items: ((() => { try { return JSON.parse(q.items); } catch { return []; } })()) })));
}

export async function POST(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const branchId = getEffectiveBranchId(request, user);
  if (!branchId) return NextResponse.json({ error: "Se requiere sucursal" }, { status: 400 });

  try {
    const body = await request.json();
    const { type, clientName, clientPhone, items, total, notes } = body;
    if (!clientName || !items || items.length === 0) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const prefix = type === "sale" ? "NV" : "COT";
    const sep = prefix + "-";
    const result = await prisma.$queryRaw<{max_num: number}[]>`
      SELECT COALESCE(MAX(CAST(REPLACE(code, ${sep}, '') AS INTEGER)), 0) as max_num
      FROM "Quotation"
      WHERE "branchId" = ${branchId} AND "type" = ${type || "quotation"} AND code ~ ${`^${prefix}-[0-9]+$`}
    `;
    const code = `${prefix}-${(result[0]?.max_num || 0) + 1}`;

    const quotation = await prisma.quotation.create({
      data: { code, type: type || "quotation", clientName, clientPhone: clientPhone || "", items: JSON.stringify(items), total: total || 0, notes: notes || "", userId: user.id, branchId },
    });

    return NextResponse.json({ ...quotation, items: ((() => { try { return JSON.parse(quotation.items); } catch { return []; } })()) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, type, clientName, clientPhone, items, total, notes } = body;
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const updateData: any = {};
    if (type) updateData.type = type;
    if (clientName !== undefined) updateData.clientName = clientName;
    if (clientPhone !== undefined) updateData.clientPhone = clientPhone;
    if (items) updateData.items = JSON.stringify(items);
    if (total !== undefined) updateData.total = total;
    if (notes !== undefined) updateData.notes = notes;

    if (type) {
      const existing = await prisma.quotation.findUnique({ where: { id } });
      if (existing && existing.type !== type) {
        const prefix = type === "sale" ? "NV" : "COT";
        const sep = prefix + "-";
        const result = await prisma.$queryRaw<{max_num: number}[]>`
          SELECT COALESCE(MAX(CAST(REPLACE(code, ${sep}, '') AS INTEGER)), 0) as max_num
          FROM "Quotation"
          WHERE "branchId" = ${existing.branchId} AND "type" = ${type} AND code ~ ${`^${prefix}-[0-9]+$`}
        `;
        updateData.code = `${prefix}-${(result[0]?.max_num || 0) + 1}`;
      }
    }

    const quotation = await prisma.quotation.update({ where: { id }, data: updateData });
    return NextResponse.json({ ...quotation, items: ((() => { try { return JSON.parse(quotation.items); } catch { return []; } })()) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    await prisma.quotation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar" }, { status: 500 });
  }
}
