import { Router } from "express";
import { prisma } from "../prisma.js";
import { auth, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { evaluationCreateSchema, evaluationPublishSchema, submissionCreateSchema } from "../schemas/evaluation.schema.js";
import { AppError } from "../utils/error-handler.js";
const r = Router();
// Listar por curso (aluno vê publicadas)
r.get("/course/:id", auth, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const u = req.user;
        const where = { courseId: id };
        if (u.role === "ALUNO")
            where.isPublished = true;
        const list = await prisma.evaluation.findMany({ where, orderBy: { id: "asc" } });
        res.json(list);
    }
    catch (e) {
        next(e);
    }
});
// Obter avaliação
r.get("/:id", auth, async (req, res, next) => {
    const ev = await prisma.evaluation.findUnique({ where: { id: Number(req.params.id) } });
    if (!ev)
        return res.status(404).json({ message: "Não encontrada" });
    res.json(ev);
});
// Professor cria avaliação
r.post("/", auth, requireRole("PROFESSOR"), validate(evaluationCreateSchema), async (req, res, next) => {
    try {
        const meId = BigInt(req.user.id);
        const c = await prisma.course.findUnique({ where: { id: req.body.courseId } });
        if (!c || String(c.teacherId) !== String(meId))
            throw new AppError("Sem acesso", 403, "FORBIDDEN");
        const ev = await prisma.evaluation.create({ data: req.body });
        res.status(201).json(ev);
    }
    catch (e) {
        next(e);
    }
});
// Publicar/despublicar
r.patch("/:id", auth, requireRole("PROFESSOR"), validate(evaluationPublishSchema), async (req, res, next) => {
    try {
        const ev = await prisma.evaluation.findUnique({ where: { id: Number(req.params.id) }, include: { course: true } });
        if (!ev)
            throw new AppError("Avaliação não encontrada", 404, "NOT_FOUND");
        if (String(ev.course.teacherId) !== String(req.user.id))
            throw new AppError("Sem acesso", 403, "FORBIDDEN");
        await prisma.evaluation.update({ where: { id: ev.id }, data: { isPublished: req.body.isPublished } });
        res.json({ message: "Atualizada" });
    }
    catch (e) {
        next(e);
    }
});
// Aluno envia respostas
r.post("/:id/submissions", auth, requireRole("ALUNO"), validate(submissionCreateSchema), async (req, res, next) => {
    try {
        const ev = await prisma.evaluation.findUnique({ where: { id: Number(req.params.id) } });
        if (!ev || !ev.isPublished)
            throw new AppError("Avaliação indisponível", 400);
        const meId = BigInt(req.user.id);
        await prisma.submission.create({ data: { evaluationId: ev.id, userId: meId, answersJson: req.body.answersJson } });
        res.status(201).json({ message: "Enviado" });
    }
    catch (e) {
        next(e);
    }
});
export default r;
