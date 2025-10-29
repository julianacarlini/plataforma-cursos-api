import { z } from "zod";
export const courseCreateSchema = z.object({ body: z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(2)
})});
export const courseUpdateSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    category: z.string().min(2).optional(),
    status: z.enum(["PENDING","APPROVED","ARCHIVED"]).optional()
  })
});
