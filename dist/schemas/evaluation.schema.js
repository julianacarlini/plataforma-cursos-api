import { z } from "zod";
export const evaluationCreateSchema = z.object({ body: z.object({
        courseId: z.number().int(),
        lessonId: z.number().int().optional(),
        title: z.string().min(3),
        schemaJson: z.any()
    }) });
export const evaluationPublishSchema = z.object({
    params: z.object({ id: z.string() }),
    body: z.object({ isPublished: z.boolean() })
});
export const submissionCreateSchema = z.object({
    params: z.object({ id: z.string() }),
    body: z.object({ answersJson: z.any() })
});
