import { z } from "zod";
export const userUpdateSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().min(3).max(120).optional(),
    email: z.string().email().optional(),
    role: z.enum(["ADMIN","PROFESSOR","ALUNO"]).optional(),
    blocked: z.boolean().optional()
  })
});
