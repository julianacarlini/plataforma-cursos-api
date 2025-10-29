import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../prisma.js";
import { signAccess, signRefresh, verifyRefresh } from "../utils/jwt.js";
import { validate } from "../middlewares/validate.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";
import { AppError, unauthorized } from "../utils/error-handler.js";
import { auth } from "../middlewares/auth.js";
const r = Router();
// POST /api/auth/register  (ALUNO/PROFESSOR)
r.post("/register", validate(registerSchema), async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        const roleRow = await prisma.role.findUnique({
            where: { name: (role || "ALUNO") }
        });
        if (!roleRow)
            throw new AppError("Papel inválido", 400);
        const passwordHash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { name, email, passwordHash, roleId: roleRow.id },
            include: { role: { select: { name: true } } }
        });
        res.status(201).json({
            message: "Cadastrado",
            id: user.id.toString(), // <<< nunca envie BigInt
            name: user.name,
            email: user.email,
            role: user.role.name
        });
    }
    catch (e) {
        next(e);
    }
});
// POST /api/auth/login
r.post("/login", validate(loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({
            where: { email },
            include: { role: { select: { name: true, id: true } } }
        });
        if (!user)
            throw new AppError("Credenciais inválidas", 401, "UNAUTHORIZED");
        if (user.blocked)
            throw new AppError("Usuário bloqueado", 401, "UNAUTHORIZED");
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok)
            throw new AppError("Credenciais inválidas", 401, "UNAUTHORIZED");
        if (!user.role)
            throw new AppError("Usuário sem papel definido", 500);
        const idStr = user.id.toString(); // <<< strings no payload
        const payload = { id: idStr, name: user.name, email: user.email, role: user.role.name };
        const access_token = signAccess(payload);
        const refresh_token = signRefresh({ id: idStr });
        res.json({
            access_token,
            refresh_token,
            user: { id: idStr, name: user.name, email: user.email, role: user.role.name }
        });
    }
    catch (e) {
        next(e);
    }
});
// POST /api/auth/refresh
r.post("/refresh", async (req, res, next) => {
    try {
        const { refreshToken, refresh_token } = req.body;
        const token = refreshToken || refresh_token;
        if (!token)
            throw new AppError("Token ausente", 401, "UNAUTHORIZED");
        const data = verifyRefresh(token); // deve conter { id: string }
        if (!data?.id)
            throw unauthorized("Token inválido");
        const u = await prisma.user.findUnique({
            where: { id: BigInt(data.id) },
            include: { role: true }
        });
        if (!u || u.blocked)
            throw new AppError("Não autorizado", 401, "UNAUTHORIZED");
        // Assine sempre com id string
        const access_token = signAccess({
            id: u.id.toString(),
            name: u.name,
            email: u.email,
            role: u.role.name
        });
        res.json({ access_token });
    }
    catch (e) {
        next(e);
    }
});
// GET /api/auth/me
r.get("/me", auth, async (req, res, next) => {
    try {
        const userId = BigInt(req.user.id); // id no JWT é string; aqui convertemos para buscar
        const u = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: { select: { name: true } } }
        });
        if (!u)
            return res.status(404).json({ error: "Usuário não encontrado" });
        res.json({
            id: u.id.toString(),
            name: u.name,
            email: u.email,
            role: u.role.name
        });
    }
    catch (e) {
        next(e);
    }
});
export default r;
