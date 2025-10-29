import { z } from "zod";
export const lessonCreateSchema = z.object({ body: z.object({
        courseId: z.number().int(),
        title: z.string().min(3),
        order: z.number().int().min(1),
        videoUrl: z.string().url().optional()
    }) });
export const lessonUpdateSchema = z.object({
    params: z.object({ id: z.string() }),
    body: z.object({
        title: z.string().min(3).optional(),
        order: z.number().int().min(1).optional(),
        videoUrl: z.string().url().optional(),
        isPublished: z.boolean().optional()
    })
});
