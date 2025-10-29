import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../prisma.js";
import { signAccess, signRefresh, verifyRefresh } from "../utils/jwt.js";
import { validate } from "../middlewares/validate.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";
import { AppError } from "../utils/error-handler.js";
import { auth } from "../middlewares/auth.js";
const r = Router();
// Registro (ALUNO/PROFESSOR)
r.post("/register", validate(registerSchema), async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        const roleRow = await prisma.role.findUnique({ where: { name: (role || "ALUNO") } });
        if (!roleRow)
            throw new AppError("Papel inválido", 400);
        const user = await prisma.user.create({
            data: { name, email, passwordHash: await bcrypt.hash(password, 12), roleId: roleRow.id }
        });
        res.status(201).json({ message: "Cadastrado", id: user.id, email: user.email });
    }
    catch (e) {
        next(e);
    }
});
// Login
r.post("/login", validate(loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email }, include: { role: { select: { name: true, id: true } } } });
        if (!user || user.blocked)
            throw new AppError("Credenciais inválidas", 401, "UNAUTHORIZED");
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok)
            throw new AppError("Credenciais inválidas", 401, "UNAUTHORIZED");
        if (!user.role) {
            throw new AppError("Usuário não tem uma permissão definida", 500);
        }
        const userIdAsString = user.id.toString();
        const payload = { id: userIdAsString, name: user.name, email: user.email, role: user.role.name };
        res.json({ accessToken: signAccess(payload), refreshToken: signRefresh({ id: userIdAsString }) });
    }
    catch (e) {
        next(e);
    }
});
// Refresh
r.post("/refresh", async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken)
            throw new AppError("Token ausente", 401, "UNAUTHORIZED");
        const data = verifyRefresh(refreshToken);
        const u = await prisma.user.findUnique({ where: { id: BigInt(data.id) }, include: { role: true } });
        if (!u || u.blocked)
            throw new AppError("Não autorizado", 401, "UNAUTHORIZED");
        const payload = { id: u.id, name: u.name, email: u.email, role: u.role.name };
        res.json({ accessToken: signAccess(payload) });
    }
    catch (e) {
        next(e);
    }
});
// GET /api/auth/me
r.get('/me', auth, async (req, res, next) => {
    try {
        const userId = BigInt(req.user.id);
        const u = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: { select: { name: true } } }
        });
        if (!u)
            return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json({
            id: u.id.toString(),
            name: u.name,
            email: u.email,
            role: u.role.name,
        });
    }
    catch (e) {
        next(e);
    }
});
export default r;
