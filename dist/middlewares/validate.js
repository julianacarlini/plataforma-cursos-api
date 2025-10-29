import sanitizeHtml from "sanitize-html";
export function validate(schema) {
    return (req, _res, next) => {
        for (const bag of ["body", "query", "params"]) {
            const obj = req[bag] || {};
            for (const k of Object.keys(obj)) {
                const v = obj[k];
                if (typeof v === "string" && (k.includes("description") || k.includes("html"))) {
                    obj[k] = sanitizeHtml(v, { allowedTags: [], allowedAttributes: {} });
                }
            }
        }
        const r = schema.safeParse({ body: req.body, query: req.query, params: req.params });
        if (!r.success)
            return next({ status: 400, code: "VALIDATION", message: "Dados inválidos", details: r.error.flatten() });
        next();
    };
}
