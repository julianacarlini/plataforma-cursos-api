import jwt, { Secret, SignOptions, JwtPayload } from 'jsonwebtoken'

// Permite usar ACCESS_SECRET/REFRESH_SECRET ou JWT_SECRET/JWT_REFRESH_SECRET
const ACCESS_SECRET: Secret  = (process.env.ACCESS_SECRET  ?? process.env.JWT_SECRET  ?? 'dev-access') as Secret
const REFRESH_SECRET: Secret = (process.env.REFRESH_SECRET ?? process.env.JWT_REFRESH_SECRET ?? 'dev-refresh') as Secret

const ACCESS_EXPIRES : SignOptions['expiresIn']  = (process.env.ACCESS_EXPIRES  ?? '120m') as any
const REFRESH_EXPIRES: SignOptions['expiresIn']  = (process.env.REFRESH_EXPIRES ?? '7d')  as any

export type TokenPayload = JwtPayload & Record<string, unknown>

export const signAccess = (p: TokenPayload) =>
  jwt.sign(p, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES })

export const signRefresh = (p: TokenPayload) =>
  jwt.sign(p, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES })

export const verifyAccess = (token: string): TokenPayload =>
  jwt.verify(token, ACCESS_SECRET) as TokenPayload

export const verifyRefresh = (token: string): TokenPayload =>
  jwt.verify(token, REFRESH_SECRET) as TokenPayload