import { z } from "zod";
export const eventCreateSchema = z.object({ body: z.object({
        courseId: z.number().int(),
        title: z.string().min(3),
        startDatetime: z.string().datetime(),
        endDatetime: z.string().datetime()
    }) });
