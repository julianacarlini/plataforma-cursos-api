import { Router } from "express";
import { prisma } from "../prisma.js";
import { auth, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { eventCreateSchema } from "../schemas/event.schema.js";
const r = Router();
// Eventos do curso (aba Calendário do curso)
r.get("/course/:id", auth, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const list = await prisma.event.findMany({ where: { courseId: id }, orderBy: { startDatetime: "asc" } });
        res.json(list);
    }
    catch (e) {
        next(e);
    }
});
// Calendário do usuário (aluno e professor veem todos associados)
r.get("/me", auth, async (req, res, next) => {
    try {
        const u = req.user;
        if (u.role === "ALUNO") {
            const courses = await prisma.enrollment.findMany({ where: { userId: BigInt(u.id) }, select: { courseId: true } });
            const ids = courses.map((c) => c.courseId);
            const events = await prisma.event.findMany({ where: { courseId: { in: ids } }, orderBy: { startDatetime: "asc" } });
            return res.json(events);
        }
        if (u.role === "PROFESSOR") {
            const events = await prisma.event.findMany({ where: { createdById: BigInt(u.id) }, orderBy: { startDatetime: "asc" } });
            return res.json(events);
        }
        res.json([]);
    }
    catch (e) {
        next(e);
    }
});
// Professor cria evento no curso dele
r.post("/", auth, requireRole("PROFESSOR"), validate(eventCreateSchema), async (req, res, next) => {
    try {
        const meId = BigInt(req.user.id);
        const c = await prisma.course.findUnique({ where: { id: req.body.courseId } });
        if (!c || String(c.teacherId) !== String(meId))
            return res.status(403).json({ message: "Sem acesso" });
        const e = await prisma.event.create({ data: { ...req.body, createdById: meId } });
        res.status(201).json(e);
    }
    catch (e) {
        next(e);
    }
});
export default r;
