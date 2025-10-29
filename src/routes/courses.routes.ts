import { Router } from "express";
import { prisma } from "../prisma.js";
import { auth, authOptional, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { courseCreateSchema, courseUpdateSchema } from "../schemas/course.schema.js";
import { AppError, notFound } from "../utils/error-handler.js";
import { z } from "zod";


const r = Router();

r.get("/", authOptional, async (req, res, next) => {
  try {
    const querySchema = z.object({
      tag: z.enum(["highlights", "new", "recommended"]).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      q: z.string().trim().min(1).max(190).optional(),
      status: z.enum(["PENDING", "APPROVED", "ARCHIVED"]).optional(),
    });

    const { tag, limit = 12, q, status } = querySchema.parse(req.query);

    const effectiveStatus = status ?? "APPROVED";
    const where: any = { status: effectiveStatus };
    if (effectiveStatus === "APPROVED") {
      where.NOT = { teacherId: null };
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }

    // ===== branch por TAG =====
    if (tag === "new") {
      const rows = await prisma.course.findMany({
        where,
        select: { id: true, title: true, description: true, category: true, imageUrl: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      const data = rows.map((c: { id: any; title: any; description: any; category: any; imageUrl: any; }) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        imageUrl: c.imageUrl ?? null,
      }));
      return res.json(data);
    }

    if (tag === 'highlights') {
      const rows = await prisma.course.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          imageUrl: true,
          updatedAt: true,
          _count: { select: { enrollments: true } },
        },
        orderBy: [{ enrollments: { _count: 'desc' } }, { updatedAt: 'desc' }],
        take: limit,
      });

      const data = rows.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        imageUrl: c.imageUrl ?? null,
      }));

      return res.json(data);
    }


    if (tag === "recommended") {
      const user = (req as any).user as { sub?: string | number } | undefined;

      if (user?.sub) {
        const userId = BigInt(user.sub as any);

        // categorias dos cursos já matriculados
        const enrolled = await prisma.enrollment.findMany({
          where: { userId },
          select: { course: { select: { id: true, category: true } } },
        });
        const cats = Array.from(new Set(enrolled.map((e: { course: { category: any; }; }) => e.course.category)));
        const alreadyIds = new Set(enrolled.map((e: { course: { id: any; }; }) => e.course.id));

        const rows = await prisma.course.findMany({
          where: {
            ...where,
            ...(cats.length ? { category: { in: cats } } : {}),
          },
          select: {
            id: true, title: true, description: true, category: true, imageUrl: true, updatedAt: true,
            _count: { select: { enrollments: true } },
          },
          orderBy: [{ enrollments: { _count: 'desc' } }, { updatedAt: 'desc' }],
          take: limit * 2,
        });

        const filtered = rows
          .filter((c: { id: unknown; }) => !alreadyIds.has(c.id))
          .slice(0, limit)
          .map((c: { id: any; title: any; description: any; category: any; imageUrl: any; }) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            category: c.category,
            imageUrl: c.imageUrl ?? null,
          }));

        if (filtered.length > 0) return res.json(filtered);
        // fallback: se nada recomendado, caímos no highlights/padrão
      }

      // fallback para highlights/padrão
      const rows = await prisma.course.findMany({
        where,
        select: { id: true, title: true, description: true, category: true, imageUrl: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });
      const data = rows.map((c: { id: any; title: any; description: any; category: any; imageUrl: any; }) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        imageUrl: c.imageUrl ?? null,
      }));
      return res.json(data);
    }

    // Sem tag: lista padrão
    const rows = await prisma.course.findMany({
      where,
      select: { id: true, title: true, description: true, category: true, imageUrl: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    const data = rows.map((c: { id: any; title: any; description: any; category: any; imageUrl: any; }) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      imageUrl: c.imageUrl ?? null,
    }));
    return res.json(data);
  } catch (e) {
    next(e);
  }
});

/** Detalhe do curso */
r.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const c = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true } },
      },
    });
    if (!c) throw notFound("Curso não encontrado");

    const teacher = c.teacher
      ? { id: String((c.teacher as any).id), name: c.teacher.name }
      : null;

    res.json({ ...c, teacher });
  } catch (e) {
    next(e);
  }
});

/** Professor cria curso (fica PENDING e sem teacherId) */
r.post("/", auth, requireRole("PROFESSOR"), validate(courseCreateSchema), async (req, res, next) => {
  try {
    const meId = BigInt((req as any).user.id);
    const c = await prisma.course.create({
      data: { ...req.body, createdById: meId },
    });
    res.status(201).json({ message: "Curso criado e aguardando aprovação", id: c.id });
  } catch (e) {
    next(e);
  }
});

/** ADMIN aprova curso */
r.patch("/:id/approve", auth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.course.update({ where: { id }, data: { status: "APPROVED" } });
    res.json({ message: "Aprovado" });
  } catch (e) {
    next(e);
  }
});

/** ADMIN edita curso */
r.patch("/:id", auth, requireRole("ADMIN"), validate(courseUpdateSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.course.update({ where: { id }, data: req.body });
    res.json({ message: "Atualizado" });
  } catch (e) {
    next(e);
  }
});

/** ADMIN exclui curso */
r.delete("/:id", auth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.course.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

/** Professor se associa a um curso (máx 3; curso sem professor) */
r.post("/:id/assign", auth, requireRole("PROFESSOR"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const meId = BigInt((req as any).user.id);

    const teacherCourses = await prisma.course.count({
      where: { teacherId: meId, status: { in: ["PENDING", "APPROVED"] as any } },
    });
    if (teacherCourses >= 3) throw new AppError("Limite de 3 cursos por professor atingido", 400);

    const c = await prisma.course.findUnique({ where: { id } });
    if (!c) throw notFound("Curso não encontrado");
    if (c.teacherId) throw new AppError("Curso já possui professor", 400);

    await prisma.course.update({ where: { id }, data: { teacherId: meId } });
    res.json({ message: "Associação realizada" });
  } catch (e) {
    next(e);
  }
});

export default r;
