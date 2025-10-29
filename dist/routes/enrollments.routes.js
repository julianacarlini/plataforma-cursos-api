import { Router } from "express";
import { prisma } from "../prisma.js";
import { auth, requireRole } from "../middlewares/auth.js";
import { AppError } from "../utils/error-handler.js";
const r = Router();
// Aluno se inscreve (só se curso APROVADO e com professor)
r.post("/", auth, requireRole("ALUNO"), async (req, res, next) => {
    try {
        const meId = BigInt(req.user.id);
        const { courseId } = req.body;
        const c = await prisma.course.findUnique({ where: { id: Number(courseId) } });
        if (!c || c.status !== "APPROVED" || !c.teacherId)
            throw new AppError("Curso indisponível para inscrição", 400);
        await prisma.enrollment.upsert({
            where: { userId_courseId: { userId: meId, courseId: Number(courseId) } },
            update: {}, create: { userId: meId, courseId: Number(courseId) }
        });
        res.status(201).json({ message: "Inscrição concluída" });
    }
    catch (e) {
        next(e);
    }
});
// Meus cursos (aluno)
r.get("/me", auth, requireRole("ALUNO"), async (req, res, next) => {
    try {
        const meId = BigInt(req.user.id);
        const list = await prisma.enrollment.findMany({
            where: { userId: meId },
            include: { course: { select: { id: true, title: true, category: true } } }
        });
        res.json(list.map((e) => e.course));
    }
    catch (e) {
        next(e);
    }
});
export default r;
