import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";
import { sendWhatsAppSafe, buildRepairCreatedMessage } from "@/lib/whatsapp";

async function generateCode(branchId: string): Promise<string> {
  const result = await prisma.$queryRaw<{max_num: number}[]>`
    SELECT COALESCE(MAX(CAST(REPLACE(code, 'OT-', '') AS INTEGER)), 0) as max_num
    FROM "Repair"
    WHERE "branchId" = ${branchId} AND code ~ '^OT-[0-9]+$'
  `;
  return `OT-${(result[0]?.max_num || 0) + 1}`;
}

export async function GET(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const branchId = getEffectiveBranchId(request, user);
  const { searchParams } = new URL(request.url);
  const paginated = searchParams.has("page");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  const where: any = {};
  if (user.role === "tech") { where.technicianId = user.id; where.branchId = user.branchId; }
  else if (branchId) { where.branchId = branchId; }

  if (status && status !== "all") where.status = status;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { device: { contains: search, mode: "insensitive" } },
      { clientName: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
    ];
  }

  // Non-paginated: return plain array (extracto, asignaciones)
  if (!paginated) {
    const repairs = await prisma.repair.findMany({
      where, include: { technician: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(repairs);
  }

  // Paginated: return object with stats (dashboard)
  const [repairs, total] = await Promise.all([
    prisma.repair.findMany({
      where, include: { technician: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit,
    }),
    prisma.repair.count({ where }),
  ]);

  const sw: any = {};
  if (user.role === "tech") { sw.technicianId = user.id; sw.branchId = user.branchId; }
  else if (branchId) { sw.branchId = branchId; }

  const [totalAll, pending, diagnosed, waitingParts, inProgress, completed, delivered, revenue] = await Promise.all([
    prisma.repair.count({ where: sw }),
    prisma.repair.count({ where: { ...sw, status: "pending" } }),
    prisma.repair.count({ where: { ...sw, status: "diagnosed" } }),
    prisma.repair.count({ where: { ...sw, status: "waiting_parts" } }),
    prisma.repair.count({ where: { ...sw, status: "in_progress" } }),
    prisma.repair.count({ where: { ...sw, status: "completed" } }),
    prisma.repair.count({ where: { ...sw, status: "delivered" } }),
    prisma.repair.aggregate({ where: { ...sw, status: "delivered" }, _sum: { estimatedCost: true } }),
  ]);

  return NextResponse.json({
    repairs, total, page, limit, totalPages: Math.ceil(total / limit),
    stats: { total: totalAll, pending: pending + diagnosed + waitingParts, inProgress, completed: completed + delivered, revenue: revenue._sum.estimatedCost || 0,
      byStatus: { pending, diagnosed, waiting_parts: waitingParts, in_progress: inProgress, completed, delivered } },
  });
}

export async function POST(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();

    // Determine branch
    const branchId = getEffectiveBranchId(request, user) || body.branchId;
    if (!branchId) return NextResponse.json({ error: "Se requiere sucursal" }, { status: 400 });

    const code = await generateCode(branchId);

    const repair = await prisma.repair.create({
      data: {
        code,
        device: body.device || "",
        brand: body.brand || null,
        model: body.model || null,
        issue: body.issue || "",
        priority: "media",
        estimatedCost: body.estimatedCost || 0,
        notes: body.notes || null,
        image: body.image || null,
        accessories: body.accessories || null,
        clientName: body.clientName || null,
        clientPhone: body.clientPhone || null,
        clientEmail: body.clientEmail || null,
        qrCode: code,
        userId: user.id,
        branchId,
        technicianId: body.technicianId || null,
      },
    });

    // Historial inicial de estado (pending)
    try {
      await prisma.statusHistory.create({
        data: {
          repairId: repair.id,
          fromStatus: null,
          toStatus: repair.status || "pending",
          changedBy: user.id,
          changedByName: user.email?.split("@")[0] || "Sistema",
          notes: "Orden creada",
        },
      });
    } catch (e) { console.error("[StatusHistory] Error:", e); }

    await prisma.notification.create({
      data: {
        type: "new_repair",
        title: "Nueva orden creada",
        message: `${repair.code} - ${repair.device} (${body.clientName || "Sin nombre"})`,
        userId: user.id,
        branchId,
      },
    });

    if (body.technicianId) {
      await prisma.notification.create({
        data: {
          type: "new_repair",
          title: "Nueva asignación",
          message: `Se te asignó ${repair.code} - ${repair.device} (${body.clientName || "Sin nombre"})`,
          userId: body.technicianId,
          branchId,
        },
      });
    }

    // Envío automático de WhatsApp al cliente (bloqueante pero seguro)
    if (repair.clientPhone) {
      try {
        const settings = await prisma.settings.findFirst();
        const origin = new URL(request.url).origin;
        const trackUrl = `${origin}/track/${repair.code}?branchId=${branchId}`;
        const msg = buildRepairCreatedMessage(
          { code: repair.code, device: repair.device, brand: repair.brand, model: repair.model, clientName: repair.clientName },
          { companyName: settings?.companyName || "RepairTrackQR" },
          trackUrl
        );
        const sent = await sendWhatsAppSafe(repair.clientPhone, msg);
        console.log(`[WhatsApp] OT ${repair.code} creada → ${repair.clientPhone}: ${sent ? "ENVIADO ✅" : "FALLÓ ❌"}`);
      } catch (err) {
        console.error("[WhatsApp] Error al enviar notificación de creación:", err);
      }
    } else {
      console.log(`[WhatsApp] OT ${repair.code} creada sin teléfono, no se envía mensaje`);
    }

    return NextResponse.json(repair);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error al crear" }, { status: 500 });
  }
}
