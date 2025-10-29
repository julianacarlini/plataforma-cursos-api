import { Router } from "express";
import { prisma } from "../prisma.js";
import { auth, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { userUpdateSchema } from "../schemas/user.schema.js";
import { notFound } from "../utils/error-handler.js";
const r = Router();
// ADMIN: lista paginada
r.get("/", auth, requireRole("ADMIN"), async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1), limit = Math.min(Number(req.query.limit || 20), 100);
        const users = await prisma.user.findMany({ include: { role: true }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } });
        res.json(users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role.name, blocked: u.blocked })));
    }
    catch (e) {
        next(e);
    }
});
// ADMIN: atualiza
r.patch("/:id", auth, requireRole("ADMIN"), validate(userUpdateSchema), async (req, res, next) => {
    try {
        const id = BigInt(req.params.id);
        const data = { ...req.body };
        if (data.role) {
            const role = await prisma.role.findUnique({ where: { name: data.role } });
            if (role) {
                data.roleId = role.id;
                delete data.role;
            }
        }
        const u = await prisma.user.update({ where: { id }, data });
        res.json({ message: "Atualizado", id: u.id });
    }
    catch (e) {
        next(e);
    }
});
// ADMIN: exclui
r.delete("/:id", auth, requireRole("ADMIN"), async (req, res, next) => {
    try {
        await prisma.user.delete({ where: { id: BigInt(req.params.id) } });
        res.status(204).end();
    }
    catch (e) {
        next(e);
    }
});
// Perfil do próprio usuário
r.get("/me/profile", auth, async (req, res, next) => {
    try {
        const me = await prisma.user.findUnique({ where: { id: BigInt(req.user.id) }, include: { role: true } });
        if (!me)
            throw notFound();
        res.json({ id: me.id, name: me.name, email: me.email, role: me.role.name });
    }
    catch (e) {
        next(e);
    }
});
r.patch("/me/profile", auth, async (req, res, next) => {
    try {
        const meId = BigInt(req.user.id);
        const u = await prisma.user.update({ where: { id: meId }, data: { name: req.body.name, email: req.body.email } });
        res.json({ message: "Atualizado", id: u.id });
    }
    catch (e) {
        next(e);
    }
});
export default r;
