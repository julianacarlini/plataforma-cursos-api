import { verifyAccess } from "../utils/jwt.js";
import { unauthorized, forbidden } from "../utils/error-handler.js";
/** Obriga ter token válido; popula req.user ou 401 */
export function auth(req, _res, next) {
    const h = req.header("authorization");
    if (!h || !h.startsWith("Bearer "))
        return next(unauthorized());
    const [, t] = h.split(" ");
    try {
        req.user = verifyAccess(t); // payload
        next();
    }
    catch {
        next(unauthorized("Token inválido"));
    }
}
/** NÃO obriga token; se vier válido, popula req.user; se não, segue sem user */
export function authOptional(req, _res, next) {
    const h = req.header("authorization");
    if (!h || !h.startsWith("Bearer "))
        return next();
    const [, t] = h.split(" ");
    try {
        const payload = verifyAccess(t); // se lançar, apenas ignora
        if (payload)
            req.user = payload;
    }
    catch {
        // ignora token inválido/expirado
    }
    next();
}
/** Exige que o usuário tenha um dos papéis informados; ADMIN passa sempre */
export function requireRole(...roles) {
    return (req, _res, next) => {
        const u = req.user;
        if (!u)
            return next(unauthorized());
        if (!roles.includes(u.role))
            return next(forbidden());
        next();
    };
}
