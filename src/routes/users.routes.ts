import { Router } from "express";
import { prisma } from "../prisma.js";
import { auth, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { userUpdateSchema } from "../schemas/user.schema.js";
import { notFound } from "../utils/error-handler.js";

const r = Router();

// ADMIN: lista paginada
// GET /api/users?page=1&limit=20
r.get("/", auth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1) || 1);
    const limit = Math.min(Math.max(1, Number(req.query.limit || 20) || 20), 100);

    const [total, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        include: { role: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const data = users.map(u => ({
      id: u.id.toString(),             // <<< evita BigInt no JSON
      name: u.name,
      email: u.email,
      role: u.role.name,
      blocked: u.blocked,
      createdAt: u.createdAt,          // Date serializa ok
      updatedAt: u.updatedAt,
    }));

    res.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      data,
    });
  } catch (e) { next(e); }
});

// ADMIN: atualiza (nome/email/role/bloqueio)
// PATCH /api/users/:id
r.patch("/:id", auth, requireRole("ADMIN"), validate(userUpdateSchema), async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const data: any = { ...req.body };

    // se vier "role" (ADMIN/PROFESSOR/ALUNO), troca por roleId
    if (data.role) {
      const role = await prisma.role.findUnique({ where: { name: data.role } });
      if (role) {
        data.roleId = role.id;
      }
      delete data.role;
    }

    // evite atualizar id / createdAt por engano
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;

    const u = await prisma.user.update({ where: { id }, data });

    res.json({
      message: "Atualizado",
      id: u.id.toString(),            // <<< evita BigInt no JSON
    });
  } catch (e) { next(e); }
});

// ADMIN: exclui
// DELETE /api/users/:id
r.delete("/:id", auth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: BigInt(req.params.id) } });
    res.status(204).end();
  } catch (e) { next(e); }
});

// Perfil do próprio usuário
// GET /api/users/me/profile
r.get("/me/profile", auth, async (req, res, next) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: BigInt((req as any).user.id) },
      include: { role: true },
    });
    if (!me) throw notFound();

    res.json({
      id: me.id.toString(),           // <<< evita BigInt no JSON
      name: me.name,
      email: me.email,
      role: me.role.name,
      blocked: me.blocked,
      createdAt: me.createdAt,
      updatedAt: me.updatedAt,
    });
  } catch (e) { next(e); }
});

// PATCH /api/users/me/profile
r.patch("/me/profile", auth, async (req, res, next) => {
  try {
    const meId = BigInt((req as any).user.id);
    const data: any = {
      name: req.body?.name,
      email: req.body?.email,
    };

    // não permitir trocar role/blocked por aqui
    delete data.role;
    delete data.blocked;

    const u = await prisma.user.update({ where: { id: meId }, data });
    res.json({ message: "Atualizado", id: u.id.toString() }); // <<< evita BigInt
  } catch (e) { next(e); }
});

export default r;
