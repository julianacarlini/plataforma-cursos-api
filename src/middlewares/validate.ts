import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import sanitizeHtml from "sanitize-html";

export function validate(schema: ZodSchema){
  return (req:Request,_res:Response,next:NextFunction)=>{
    for (const bag of ["body","query","params"] as const) {
      const obj:any=(req as any)[bag]||{};
      for (const k of Object.keys(obj)) {
        const v=obj[k];
        if (typeof v==="string" && (k.includes("description")||k.includes("html"))) {
          obj[k]=sanitizeHtml(v,{allowedTags:[],allowedAttributes:{}});
        }
      }
    }
    const r=schema.safeParse({body:req.body,query:req.query,params:req.params});
    if(!r.success) return next({status:400,code:"VALIDATION",message:"Dados inválidos",details:r.error.flatten()});
    next();
  };
}
