import { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  status = 400; code = "BAD_REQUEST"; details?: any;
  constructor(message:string, status=400, code="BAD_REQUEST", details?:any){ super(message); this.status=status; this.code=code; this.details=details; }
}
export const notFound = (m="Not found") => new AppError(m,404,"NOT_FOUND");
export const unauthorized = (m="Unauthorized") => new AppError(m,401,"UNAUTHORIZED");
export const forbidden = (m="Forbidden") => new AppError(m,403,"FORBIDDEN");

/*export function errorHandler(err:any,_req:Request,res:Response,_n:NextFunction){
  if (err.code==="P2002") return res.status(409).json({code:"CONFLICT",message:"Unique constraint violation"});
  const s=err.status||500,c=err.code||"INTERNAL",m=err.message||"Erro interno";
  res.status(s).json({code:c,message:m,details:err.details});
}*/

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[ERR]', err) // veja o stack no terminal
  const status = typeof err.status === 'number' ? err.status : 500
  const msg = err?.message || 'Internal Server Error'
  res.status(status).json({ error: msg })
}