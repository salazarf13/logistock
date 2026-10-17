import { Router } from "express";
import bcrypt from "bcryptjs";
import { query, withTransaction } from "./db.js";
import { requireAuth, signUser } from "./middleware/auth.js";
import {
  bootstrap,
  listCategorias,
  listCompras,
  listPedidos,
  listProductos,
  listProveedores,
  listRutas,
  listUsuarios,
  listVehiculos,
} from "./services.js";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const [user] = await query("SELECT * FROM usuarios WHERE email = $1 AND activo = TRUE", [email]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Correo o contraseña incorrectos" });
  }
  const publicUser = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
  return res.json({ token: signUser(publicUser), user: publicUser });
});

router.get("/auth/me", requireAuth(), (req, res) => {
  res.json({ user: req.user });
});

router.get("/bootstrap", requireAuth(), async (_req, res) => {
  res.json(await bootstrap());
});

router.get("/usuarios", requireAuth("administrador"), async (_req, res) => {
  res.json(await listUsuarios());
});

function upsertTable(table, fields, roles) {
  router.post(`/${table}`, requireAuth(...roles), async (req, res) => {
    const cols = fields.filter((f) => req.body[f] !== undefined);
    const values = cols.map((f) => (req.body[f] === "" ? null : req.body[f]));
    const placeholders = cols.map((_, i) => `$${i + 1}`);
    const [row] = await query(
      `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders.join(",")}) RETURNING *`,
      values
    );
    res.status(201).json(row);
  });

  router.put(`/${table}/:id`, requireAuth(...roles), async (req, res) => {
    const cols = fields.filter((f) => req.body[f] !== undefined);
    const values = cols.map((f) => (req.body[f] === "" ? null : req.body[f]));
    const sets = cols.map((c, i) => `${c}=$${i + 1}`);
    const [row] = await query(
      `UPDATE ${table} SET ${sets.join(",")} WHERE id=$${cols.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    if (!row) return res.status(404).json({ error: "No encontrado" });
    res.json(row);
  });
}

upsertTable("categorias", ["nombre", "descripcion"], ["administrador"]);
upsertTable(
  "proveedores",
  ["nombre", "nit", "telefono", "email", "direccion"],
  ["administrador", "bodeguero"]
);
upsertTable(
  "productos",
  [
    "sku",
    "codigo_barras",
    "nombre",
    "descripcion",
    "categoria_id",
    "proveedor_id",
    "precio_compra",
    "precio_venta",
    "stock",
    "stock_minimo",
    "unidad",
    "activo",
  ],
  ["administrador", "bodeguero"]
);
upsertTable(
  "vehiculos",
  ["placa", "marca", "modelo", "capacidad_kg", "conductor_id", "estado"],
  ["administrador"]
);

router.get("/categorias", requireAuth(), async (_req, res) => res.json(await listCategorias()));
router.get("/proveedores", requireAuth(), async (_req, res) => res.json(await listProveedores()));
router.get("/productos", requireAuth(), async (_req, res) => res.json(await listProductos()));
router.get("/compras", requireAuth("administrador", "bodeguero"), async (_req, res) =>
  res.json(await listCompras())
);
router.get("/pedidos", requireAuth(), async (_req, res) => res.json(await listPedidos()));
router.get("/vehiculos", requireAuth(), async (_req, res) => res.json(await listVehiculos()));
router.get("/rutas", requireAuth(), async (req, res) => {
  const all = await listRutas();
  if (req.user.rol === "conductor") {
    return res.json(all.filter((r) => r.conductor_id === req.user.id));
  }
  res.json(all);
});

router.post("/compras", requireAuth("administrador", "bodeguero"), async (req, res) => {
  const { proveedor_id, detalle = [] } = req.body;
  if (!proveedor_id || !detalle.length) {
    return res.status(400).json({ error: "Proveedor y detalle son obligatorios" });
  }
  const total = detalle.reduce((s, d) => s + Number(d.cantidad) * Number(d.costo_unitario), 0);
  try {
    const compra = await withTransaction(async (q) => {
      const created = await q(
        `INSERT INTO compras (proveedor_id, usuario_id, total, estado) VALUES ($1,$2,$3,'registrada') RETURNING *`,
        [proveedor_id, req.user.id, total]
      );
      for (const line of detalle) {
        await q(
          `INSERT INTO compra_detalle (compra_id, producto_id, cantidad, costo_unitario) VALUES ($1,$2,$3,$4)`,
          [created[0].id, line.producto_id, line.cantidad, line.costo_unitario]
        );
        await q(`UPDATE productos SET stock = stock + $1 WHERE id = $2`, [line.cantidad, line.producto_id]);
      }
      return created[0];
    });
    res.status(201).json(compra);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/pedidos", requireAuth("administrador", "bodeguero"), async (req, res) => {
  const { cliente_id, notas, detalle = [] } = req.body;
  if (!cliente_id || !detalle.length) {
    return res.status(400).json({ error: "Cliente y productos son obligatorios" });
  }
  try {
    const pedido = await withTransaction(async (q) => {
      for (const line of detalle) {
        const prod = await q("SELECT nombre, stock FROM productos WHERE id=$1", [line.producto_id]);
        if (!prod[0] || prod[0].stock < Number(line.cantidad)) {
          throw new Error(`Stock insuficiente: ${prod[0]?.nombre || "producto"}`);
        }
      }
      const total = detalle.reduce((s, d) => s + Number(d.cantidad) * Number(d.precio_unitario), 0);
      const created = await q(
        `INSERT INTO pedidos (cliente_id, usuario_id, total, notas, estado, stock_descontado)
         VALUES ($1,$2,$3,$4,'pendiente', TRUE) RETURNING *`,
        [cliente_id, req.user.id, total, notas || ""]
      );
      for (const line of detalle) {
        await q(
          `INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1,$2,$3,$4)`,
          [created[0].id, line.producto_id, line.cantidad, line.precio_unitario]
        );
        const updated = await q(
          `UPDATE productos SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING id`,
          [line.cantidad, line.producto_id]
        );
        if (!updated[0]) throw new Error("No se pudo descontar stock");
      }
      return created[0];
    });
    res.status(201).json(pedido);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/pedidos/:id/estado", requireAuth("administrador", "bodeguero"), async (req, res) => {
  const estado = req.body.estado;
  try {
    const updated = await withTransaction(async (q) => {
      const pedidoRes = await q("SELECT * FROM pedidos WHERE id=$1", [req.params.id]);
      const pedido = pedidoRes[0];
      if (!pedido) throw new Error("Pedido no encontrado");
      const detalle = await q("SELECT * FROM pedido_detalle WHERE pedido_id=$1", [pedido.id]);
      let stockDescontado = pedido.stock_descontado;
      const debeDescontar = ["en_picking", "listo", "en_ruta", "entregado"].includes(estado);

      if (debeDescontar && !pedido.stock_descontado) {
        for (const line of detalle) {
          const prod = await q("SELECT nombre, stock FROM productos WHERE id=$1", [line.producto_id]);
          if (!prod[0] || prod[0].stock < line.cantidad) {
            throw new Error(`Stock insuficiente: ${prod[0]?.nombre || "producto"}`);
          }
        }
        for (const line of detalle) {
          await q("UPDATE productos SET stock = stock - $1 WHERE id=$2", [line.cantidad, line.producto_id]);
        }
        stockDescontado = true;
      }

      if (estado === "cancelado" && pedido.stock_descontado) {
        for (const line of detalle) {
          await q("UPDATE productos SET stock = stock + $1 WHERE id=$2", [line.cantidad, line.producto_id]);
        }
        stockDescontado = false;
      }

      const rows = await q("UPDATE pedidos SET estado=$1, stock_descontado=$2 WHERE id=$3 RETURNING *", [
        estado,
        stockDescontado,
        pedido.id,
      ]);
      return rows[0];
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/rutas", requireAuth("administrador"), async (req, res) => {
  const { vehiculo_id, conductor_id, fecha, pedido_ids = [], polyline, distancia_km } = req.body;
  if (!vehiculo_id || !conductor_id || !pedido_ids.length) {
    return res.status(400).json({ error: "Vehículo, conductor y pedidos son obligatorios" });
  }
  try {
    const ruta = await withTransaction(async (q) => {
      const created = await q(
        `INSERT INTO rutas (vehiculo_id, conductor_id, fecha, estado, polyline, distancia_km)
         VALUES ($1,$2,$3,'planificada',$4,$5) RETURNING *`,
        [vehiculo_id, conductor_id, fecha, polyline ? JSON.stringify(polyline) : null, distancia_km || null]
      );
      for (let i = 0; i < pedido_ids.length; i++) {
        await q(
          `INSERT INTO ruta_paradas (ruta_id, pedido_id, orden, estado) VALUES ($1,$2,$3,'pendiente')`,
          [created[0].id, pedido_ids[i], i + 1]
        );
        await q(
          `UPDATE pedidos SET estado = CASE WHEN estado = 'pendiente' THEN 'listo' ELSE 'en_ruta' END WHERE id=$1`,
          [pedido_ids[i]]
        );
      }
      await q(`UPDATE vehiculos SET estado='en_ruta', conductor_id=$1 WHERE id=$2`, [
        conductor_id,
        vehiculo_id,
      ]);
      return created[0];
    });
    res.status(201).json(ruta);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/rutas/:id/paradas", requireAuth("administrador", "conductor"), async (req, res) => {
  const { pedido_id, estado } = req.body;
  try {
    await withTransaction(async (q) => {
      const rutaRes = await q("SELECT * FROM rutas WHERE id=$1", [req.params.id]);
      const ruta = rutaRes[0];
      if (!ruta) throw new Error("Ruta no encontrada");
      if (req.user.rol === "conductor" && ruta.conductor_id !== req.user.id) {
        throw new Error("Esta ruta no está asignada a tu usuario");
      }
      await q(
        `UPDATE ruta_paradas SET estado=$1, entregado_en = CASE WHEN $1='entregado' THEN NOW() ELSE NULL END
         WHERE ruta_id=$2 AND pedido_id=$3`,
        [estado, ruta.id, pedido_id]
      );
      if (estado === "entregado") {
        await q("UPDATE pedidos SET estado='entregado' WHERE id=$1", [pedido_id]);
      }
      await q("UPDATE rutas SET estado='en_curso' WHERE id=$1 AND estado='planificada'", [ruta.id]);
      const pending = await q(
        "SELECT COUNT(*)::int AS n FROM ruta_paradas WHERE ruta_id=$1 AND estado='pendiente'",
        [ruta.id]
      );
      if (Number(pending[0].n) === 0) {
        await q("UPDATE rutas SET estado='completada' WHERE id=$1", [ruta.id]);
        await q("UPDATE vehiculos SET estado='disponible' WHERE id=$1", [ruta.vehiculo_id]);
      }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
