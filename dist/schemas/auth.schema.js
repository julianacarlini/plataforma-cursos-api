import { z } from "zod";
export const registerSchema = z.object({ body: z.object({
        name: z.string().min(3).max(120),
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(["ALUNO", "PROFESSOR"]).optional()
    }) });
export const loginSchema = z.object({ body: z.object({
        email: z.string().email(),
        password: z.string().min(8)
    }) });
