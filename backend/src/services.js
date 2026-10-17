import bcrypt from "bcryptjs";
import { query } from "./db.js";

function n(v) {
  return v == null ? 0 : Number(v);
}

function json(v, fallback = []) {
  if (v == null) return fallback;
  if (typeof v === "string") return JSON.parse(v);
  return v;
}

export async function listCategorias() {
  return query("SELECT * FROM categorias ORDER BY nombre");
}

export async function listProveedores() {
  return query("SELECT * FROM proveedores ORDER BY nombre");
}

export async function listClientes() {
  const rows = await query("SELECT * FROM clientes ORDER BY nombre");
  return rows.map((c) => ({ ...c, lat: n(c.lat), lng: n(c.lng) }));
}

export async function listUsuarios() {
  return query(
    "SELECT id, nombre, email, rol, telefono, activo FROM usuarios ORDER BY id"
  );
}

export async function listProductos() {
  const rows = await query("SELECT * FROM productos ORDER BY nombre");
  return rows.map((p) => ({
    ...p,
    precio_compra: n(p.precio_compra),
    precio_venta: n(p.precio_venta),
  }));
}

export async function listCompras() {
  const rows = await query(`
    SELECT c.*,
      COALESCE((
        SELECT json_agg(json_build_object(
          'producto_id', d.producto_id,
          'cantidad', d.cantidad,
          'costo_unitario', d.costo_unitario::float
        ) ORDER BY d.id)
        FROM compra_detalle d WHERE d.compra_id = c.id
      ), '[]'::json) AS detalle
    FROM compras c
    ORDER BY c.id DESC
  `);
  return rows.map((c) => ({ ...c, total: n(c.total), detalle: json(c.detalle) }));
}

export async function listPedidos() {
  const rows = await query(`
    SELECT p.*,
      COALESCE((
        SELECT json_agg(json_build_object(
          'producto_id', d.producto_id,
          'cantidad', d.cantidad,
          'precio_unitario', d.precio_unitario::float
        ) ORDER BY d.id)
        FROM pedido_detalle d WHERE d.pedido_id = p.id
      ), '[]'::json) AS detalle
    FROM pedidos p
    ORDER BY p.id
  `);
  return rows.map((p) => ({ ...p, total: n(p.total), detalle: json(p.detalle) }));
}

export async function listVehiculos() {
  return query("SELECT * FROM vehiculos ORDER BY id");
}

export async function listRutas() {
  const rows = await query(`
    SELECT r.*,
      COALESCE((
        SELECT json_agg(json_build_object(
          'pedido_id', p.pedido_id,
          'orden', p.orden,
          'estado', p.estado,
          'entregado_en', p.entregado_en
        ) ORDER BY p.orden)
        FROM ruta_paradas p WHERE p.ruta_id = r.id
      ), '[]'::json) AS paradas
    FROM rutas r
    ORDER BY r.id DESC
  `);
  return rows.map((r) => ({
    ...r,
    distancia_km: r.distancia_km == null ? null : n(r.distancia_km),
    paradas: json(r.paradas),
    polyline: r.polyline
      ? typeof r.polyline === "string"
        ? JSON.parse(r.polyline)
        : r.polyline
      : null,
  }));
}

export async function bootstrap() {
  const [categorias, proveedores, clientes, productos, compras, pedidos, vehiculos, rutas, usuarios] =
    await Promise.all([
      listCategorias(),
      listProveedores(),
      listClientes(),
      listProductos(),
      listCompras(),
      listPedidos(),
      listVehiculos(),
      listRutas(),
      listUsuarios(),
    ]);
  return { categorias, proveedores, clientes, productos, compras, pedidos, vehiculos, rutas, usuarios };
}

export async function seedIfEmpty() {
  const [{ count }] = await query("SELECT COUNT(*)::int AS count FROM usuarios");
  if (count > 0) return false;

  const hash = async (pwd) => bcrypt.hash(pwd, 10);
  await query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol, telefono) VALUES
      ($1,$2,$3,'administrador',$4),
      ($5,$6,$7,'bodeguero',$8),
      ($9,$10,$11,'conductor',$12)`,
    [
      "German Salazar",
      "admin@logistock.com",
      await hash("admin123"),
      "7761-0001",
      "María López",
      "bodega@logistock.com",
      await hash("bodega123"),
      "7761-0002",
      "Carlos Méndez",
      "conductor@logistock.com",
      await hash("conductor123"),
      "7761-0003",
    ]
  );

  await query(
    `INSERT INTO categorias (nombre, descripcion) VALUES
      ('Abarrotes', 'Granos, aceites y despensa'),
      ('Bebidas', 'Agua, jugos y gaseosas'),
      ('Limpieza', 'Hogar e institucional'),
      ('Cuidado personal', 'Higiene y farmacia básica')`
  );

  await query(
    `INSERT INTO proveedores (nombre, nit, telefono, email, direccion) VALUES
      ('Distribuidora del Altiplano', '1234567-8', '7765-1100', 'ventas@altiplano.gt', 'Zona 3, Quetzaltenango'),
      ('Alimentos del Sur S.A.', '8765432-1', '2420-3300', 'pedidos@alsur.gt', 'Km 15.5 Carretera a Escuintla')`
  );

  await query(
    `INSERT INTO clientes (nombre, telefono, email, direccion, lat, lng) VALUES
      ('Mini Super La Fe', '7761-2211', 'lafe@correo.com', '4a Calle 12-40 Zona 1, Xela', 14.8389, -91.5185),
      ('Farmacia Galeno', '7761-3344', 'galeno@correo.com', 'Avenida Las Américas Zona 3', 14.8442, -91.5088),
      ('Tienda Don Chepe', '5412-8899', 'chepe@correo.com', 'Salcajá, céntrico', 14.878, -91.456),
      ('Abarrotes El Cerrito', '7768-1010', 'cerrito@correo.com', 'Cantel, mercado municipal', 14.811, -91.455)`
  );

  await query(
    `INSERT INTO productos (sku, codigo_barras, nombre, descripcion, categoria_id, proveedor_id, precio_compra, precio_venta, stock, stock_minimo, unidad) VALUES
      ('AB-ARZ-25','7501234500011','Arroz blanco 25 lb','Saco de arroz grano largo',1,1,95,125,48,20,'saco'),
      ('AB-FRJ-25','7501234500028','Frijol negro 25 lb','Frijol negro de primera',1,1,110,145,12,15,'saco'),
      ('AB-AZU-50','7501234500035','Azúcar 50 lb','Azúcar refinada',1,2,160,198,30,10,'saco'),
      ('BB-AGU-12','7501234500042','Agua pura 600 ml x12','Paquete de 12 botellas',2,2,28,42,80,24,'paquete'),
      ('LM-DET-5K','7501234500059','Detergente en polvo 5 kg','Uso institucional',3,1,55,78,6,12,'bolsa')`
  );

  await query(
    `INSERT INTO vehiculos (placa, marca, modelo, capacidad_kg, conductor_id, estado) VALUES
      ('P-458GT','Toyota','Hilux',1000,3,'disponible'),
      ('C-902QL','Isuzu','NPR',3500,NULL,'mantenimiento')`
  );

  const compra = await query(
    `INSERT INTO compras (proveedor_id, usuario_id, total, estado) VALUES (1, 2, 2850, 'registrada') RETURNING id`
  );
  await query(
    `INSERT INTO compra_detalle (compra_id, producto_id, cantidad, costo_unitario) VALUES ($1,1,20,95), ($1,2,10,110)`,
    [compra[0].id]
  );

  const p1 = await query(
    `INSERT INTO pedidos (cliente_id, usuario_id, total, notas, estado, stock_descontado)
     VALUES (1,1,419,'Entregar antes de las 11:00','listo', TRUE) RETURNING id`
  );
  await query(
    `INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1,1,2,125), ($1,4,4,42)`,
    [p1[0].id]
  );

  const p2 = await query(
    `INSERT INTO pedidos (cliente_id, usuario_id, total, notas, estado, stock_descontado)
     VALUES (2,1,223,'','pendiente', FALSE) RETURNING id`
  );
  await query(
    `INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1,5,1,78), ($1,2,1,145)`,
    [p2[0].id]
  );

  const p3 = await query(
    `INSERT INTO pedidos (cliente_id, usuario_id, total, notas, estado, stock_descontado)
     VALUES (3,1,396,'Llamar al llegar','listo', TRUE) RETURNING id`
  );
  await query(
    `INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1,3,2,198)`,
    [p3[0].id]
  );

  const ruta = await query(
    `INSERT INTO rutas (vehiculo_id, conductor_id, fecha, estado) VALUES (1,3, CURRENT_DATE, 'planificada') RETURNING id`
  );
  await query(
    `INSERT INTO ruta_paradas (ruta_id, pedido_id, orden, estado) VALUES ($1,$2,1,'pendiente'), ($1,$3,2,'pendiente')`,
    [ruta[0].id, p1[0].id, p3[0].id]
  );

  return true;
}
