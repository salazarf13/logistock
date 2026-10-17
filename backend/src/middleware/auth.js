import jwt from "jsonwebtoken";

export function requireAuth(...roles) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.length && !roles.includes(payload.rol)) {
        return res.status(403).json({ error: "Sin permiso para este módulo" });
      }
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ error: "Token inválido o vencido" });
    }
  };
}

export function signUser(user) {
  return jwt.sign(
    { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}
