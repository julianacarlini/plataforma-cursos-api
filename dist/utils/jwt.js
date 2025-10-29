import jwt from 'jsonwebtoken';
// Permite usar ACCESS_SECRET/REFRESH_SECRET ou JWT_SECRET/JWT_REFRESH_SECRET
const ACCESS_SECRET = (process.env.ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access');
const REFRESH_SECRET = (process.env.REFRESH_SECRET ?? process.env.JWT_REFRESH_SECRET ?? 'dev-refresh');
const ACCESS_EXPIRES = (process.env.ACCESS_EXPIRES ?? '15m');
const REFRESH_EXPIRES = (process.env.REFRESH_EXPIRES ?? '7d');
export const signAccess = (p) => jwt.sign(p, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
export const signRefresh = (p) => jwt.sign(p, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
export const verifyAccess = (token) => jwt.verify(token, ACCESS_SECRET);
export const verifyRefresh = (token) => jwt.verify(token, REFRESH_SECRET);
