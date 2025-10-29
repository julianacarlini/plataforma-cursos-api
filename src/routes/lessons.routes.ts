import { Router } from "express";
import { prisma } from "../prisma.js";
import { auth, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { lessonCreateSchema, lessonUpdateSchema } from "../schemas/lesson.schema.js";
import { AppError } from "../utils/error-handler.js";
const r = Router();

// Lista aulas por curso (aluno vê só publicadas; professor vê todas do seu curso)
r.get("/course/:courseId", auth, async (req,res,next)=>{
  try{
    const courseId=Number(req.params.courseId);
    const me=(req as any).user;
    const where:any={ courseId };
    if (me.role==="ALUNO") where.isPublished=true;
    if (me.role==="PROFESSOR") {
      const c=await prisma.course.findUnique({ where:{ id:courseId }});
      if (!c || String(c.teacherId)!==String(me.id)) throw new AppError("Sem acesso a este curso",403,"FORBIDDEN");
    }
    const lessons=await prisma.lesson.findMany({ where, orderBy:{ order:"asc" }, include:{ materials:true, evaluations:true }});
    res.json(lessons);
  }catch(e){next(e);}
});

// Criar/editar aula (professor do curso)
r.post("/", auth, requireRole("PROFESSOR"), validate(lessonCreateSchema), async (req,res,next)=>{
  try{
    const meId=BigInt((req as any).user.id);
    const c=await prisma.course.findUnique({ where:{ id:req.body.courseId }});
    if (!c || String(c.teacherId)!==String(meId)) throw new AppError("Sem acesso",403,"FORBIDDEN");
    const l=await prisma.lesson.create({ data:req.body }); res.status(201).json(l);
  }catch(e){next(e);}
});
r.patch("/:id", auth, requireRole("PROFESSOR"), validate(lessonUpdateSchema), async (req,res,next)=>{
  try{
    const id=Number(req.params.id);
    const l=await prisma.lesson.findUnique({ where:{ id }, include:{ course:true }});
    if (!l) throw new AppError("Aula não encontrada",404,"NOT_FOUND");
    if (String(l.course.teacherId)!==String((req as any).user.id)) throw new AppError("Sem acesso",403,"FORBIDDEN");
    const up=await prisma.lesson.update({ where:{id}, data:req.body }); res.json(up);
  }catch(e){next(e);}
});

export default r;
