import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { prisma } from "../prisma.js";
import { auth, requireRole } from "../middlewares/auth.js";
import { AppError } from "../utils/error-handler.js";

const r=Router();
const uploadDir = process.env.UPLOAD_DIR || "uploads";
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req,_file,cb)=>cb(null, uploadDir),
  filename: (_req,file,cb)=>cb(null, Date.now()+"-"+file.originalname)
});
const upload = multer({ storage });

// Professor envia material para uma aula
r.post("/lessons/:lessonId", auth, requireRole("PROFESSOR"), upload.single("file"), async (req,res,next)=>{
  try{
    const l=await prisma.lesson.findUnique({ where:{ id:Number(req.params.lessonId) }, include:{ course:true }});
    if(!l) throw new AppError("Aula não existe",404,"NOT_FOUND");
    if(String(l.course.teacherId)!==String((req as any).user.id)) throw new AppError("Sem acesso",403,"FORBIDDEN");
    const m=await prisma.material.create({ data:{ lessonId:l.id, filename:req.file!.originalname, path:req.file!.filename }});
    res.status(201).json(m);
  }catch(e){next(e);}
});

// Download (alunos/professores inscritos/associados)
r.get("/:id/download", auth, async (req,res,next)=>{
  try{
    const m=await prisma.material.findUnique({ where:{ id:Number(req.params.id) }, include:{ lesson:{ include:{ course:true }}}});
    if(!m) throw new AppError("Material não encontrado",404,"NOT_FOUND");
    const u=(req as any).user;
    if (u.role==="ALUNO") {
      const insc = await prisma.enrollment.findUnique({ where:{ userId_courseId:{ userId: BigInt(u.id), courseId: m.lesson.courseId } }});
      if (!insc) throw new AppError("Sem acesso",403,"FORBIDDEN");
    }
    if (u.role==="PROFESSOR" && String(m.lesson.course.teacherId)!==String(u.id)) {
      throw new AppError("Sem acesso",403,"FORBIDDEN");
    }
    res.download(path.join(uploadDir, m.path), m.filename);
  }catch(e){next(e);}
});

export default r;
