<?php
/**
 * Front controller de la API PHP.
 * Arranque: C:\xampp\php\php.exe -S localhost:4000 api\index.php
 */

require __DIR__ . "/helpers.php";
require __DIR__ . "/jwt.php";
require __DIR__ . "/queries.php";

cors();

$cfg = require __DIR__ . "/config.php";
$method = $_SERVER["REQUEST_METHOD"];
$uri = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
$path = preg_replace("#^/api#", "", $uri);
$path = $path === "" ? "/" : $path;

if ($path === "/health") {
    send_json(["ok" => true, "name" => "LogiStock API PHP + MySQL"]);
}

try {
    $pdo = pdo_connect($cfg["name"]);
    ensure_schema($pdo);
} catch (Throwable $e) {
    send_json([
        "error" => "No se pudo conectar a MySQL. Enciende MySQL en XAMPP y ejecuta: php api/install.php",
        "detalle" => $e->getMessage(),
    ], 500);
}

$body = json_input();

if ($method === "POST" && $path === "/auth/login") {
    try {
        $email = strtolower(trim($body["email"] ?? ""));
        $password = $body["password"] ?? "";
        $user = one_row($pdo, "SELECT * FROM usuarios WHERE email = ? AND activo = 1", [$email]);
        if (!$user || !password_verify($password, $user["password_hash"])) {
            send_json(["error" => "Correo o contraseña incorrectos"], 401);
        }
        $public = [
            "id" => bint($user["id"]),
            "nombre" => $user["nombre"],
            "email" => $user["email"],
            "rol" => $user["rol"],
        ];
        send_json(["token" => jwt_encode($public, $cfg["jwt"]), "user" => $public]);
    } catch (Throwable $e) {
        send_json(["error" => "No se pudo iniciar sesión", "detalle" => $e->getMessage()], 500);
    }
}

$user = require_user($pdo);

if ($method === "GET" && $path === "/auth/me") {
    send_json(["user" => $user]);
}
if ($method === "POST" && $path === "/auth/cambiar-usuario") {
    require_user($pdo, ["administrador"]);
    $objetivo = one_row(
        $pdo,
        "SELECT * FROM usuarios WHERE id = ? AND activo = 1",
        [(int) ($body["usuario_id"] ?? 0)]
    );
    if (!$objetivo) {
        send_json(["error" => "Usuario no encontrado o inactivo"], 404);
    }
    $public = [
        "id" => bint($objetivo["id"]),
        "nombre" => $objetivo["nombre"],
        "email" => $objetivo["email"],
        "rol" => $objetivo["rol"],
    ];
    send_json(["token" => jwt_encode($public, $cfg["jwt"]), "user" => $public]);
}
if ($method === "GET" && $path === "/bootstrap") {
    send_json(bootstrap($pdo, $user));
}
if ($method === "GET" && $path === "/usuarios") {
    if ($user["rol"] !== "administrador") {
        send_json(["error" => "Sin permiso para este módulo"], 403);
    }
    send_json(list_usuarios($pdo));
}

if ($method === "POST" && $path === "/usuarios") {
    if ($user["rol"] !== "administrador") {
        send_json(["error" => "Sin permiso para este módulo"], 403);
    }
    $nombre = trim($body["nombre"] ?? "");
    $email = strtolower(trim($body["email"] ?? ""));
    $password = $body["password"] ?? "";
    $rol = $body["rol"] ?? "bodeguero";
    $telefono = $body["telefono"] ?? "";
    $activo = !empty($body["activo"]) || $body["activo"] === true || $body["activo"] === 1;
    if (!$nombre || !$email || strlen($password) < 4) {
        send_json(["error" => "Nombre, correo y contraseña (mín. 4) son obligatorios"], 400);
    }
    if (!in_array($rol, ["administrador", "bodeguero", "conductor"], true)) {
        send_json(["error" => "Rol no válido"], 400);
    }
    try {
        $pdo->prepare("INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, activo) VALUES (?,?,?,?,?,?)")
            ->execute([$nombre, $email, password_hash($password, PASSWORD_BCRYPT), $rol, $telefono, $activo ? 1 : 0]);
        send_json(one_row($pdo, "SELECT id, nombre, email, rol, telefono, activo FROM usuarios WHERE id = ?", [(int) $pdo->lastInsertId()]), 201);
    } catch (Throwable $e) {
        send_json(["error" => "No se pudo crear. El correo ya existe o los datos son inválidos."], 400);
    }
}

if ($method === "PUT" && preg_match("#^/usuarios/(\\d+)$#", $path, $m)) {
    if ($user["rol"] !== "administrador") {
        send_json(["error" => "Sin permiso para este módulo"], 403);
    }
    $id = (int) $m[1];
    $nombre = trim($body["nombre"] ?? "");
    $email = strtolower(trim($body["email"] ?? ""));
    $rol = $body["rol"] ?? "bodeguero";
    $telefono = $body["telefono"] ?? "";
    $activo = array_key_exists("activo", $body) ? (!empty($body["activo"]) || $body["activo"] === true) : true;
    if (!$nombre || !$email) {
        send_json(["error" => "Nombre y correo son obligatorios"], 400);
    }
    if (!in_array($rol, ["administrador", "bodeguero", "conductor"], true)) {
        send_json(["error" => "Rol no válido"], 400);
    }
    try {
        $pdo->prepare("UPDATE usuarios SET nombre=?, email=?, rol=?, telefono=?, activo=? WHERE id=?")
            ->execute([$nombre, $email, $rol, $telefono, $activo ? 1 : 0, $id]);
        $pwd = $body["password"] ?? "";
        if (strlen($pwd) >= 4) {
            $pdo->prepare("UPDATE usuarios SET password_hash=? WHERE id=?")
                ->execute([password_hash($pwd, PASSWORD_BCRYPT), $id]);
        }
        send_json(one_row($pdo, "SELECT id, nombre, email, rol, telefono, activo FROM usuarios WHERE id = ?", [$id]));
    } catch (Throwable $e) {
        send_json(["error" => "No se pudo actualizar el usuario."], 400);
    }
}

$tables = [
    "categorias" => [["nombre", "descripcion"], ["administrador"]],
    "proveedores" => [["nombre", "nit", "telefono", "email", "direccion"], ["administrador", "bodeguero"]],
    "productos" => [[
        "sku", "codigo_barras", "nombre", "descripcion", "categoria_id", "proveedor_id",
        "precio_compra", "precio_venta", "stock", "stock_minimo", "unidad", "activo",
    ], ["administrador", "bodeguero"]],
    "vehiculos" => [["placa", "marca", "modelo", "capacidad_kg", "conductor_id", "estado"], ["administrador"]],
];

foreach ($tables as $table => [$fields, $roles]) {
    if ($method === "GET" && $path === "/$table") {
        $fn = "list_$table";
        send_json($fn($pdo));
    }
    if ($method === "POST" && $path === "/$table") {
        require_user($pdo, $roles);
        send_json(upsert_row($pdo, $table, $fields, $body, null), 201);
    }
    if ($method === "PUT" && preg_match("#^/$table/(\d+)$#", $path, $m)) {
        require_user($pdo, $roles);
        send_json(upsert_row($pdo, $table, $fields, $body, (int) $m[1]));
    }
}

if ($method === "GET" && $path === "/compras") {
    require_user($pdo, ["administrador", "bodeguero"]);
    send_json(list_compras($pdo));
}
if ($method === "GET" && $path === "/pedidos") {
    send_json(list_pedidos($pdo));
}
if ($method === "GET" && $path === "/rutas") {
    $cid = $user["rol"] === "conductor" ? bint($user["id"]) : null;
    send_json(list_rutas($pdo, $cid));
}
if ($method === "POST" && preg_match("#^/productos/(\\d+)/stock$#", $path, $m)) {
    require_user($pdo, ["administrador", "bodeguero"]);
    $pid = (int) $m[1];
    $qty = (int) ($body["cantidad"] ?? 0);
    if ($qty < 1) {
        send_json(["error" => "La cantidad debe ser un entero mayor que 0"], 400);
    }
    $pdo->beginTransaction();
    try {
        $prod = one_row($pdo, "SELECT id FROM productos WHERE id = ? FOR UPDATE", [$pid]);
        if (!$prod) {
            throw new RuntimeException("Producto no encontrado");
        }
        $pdo->prepare("UPDATE productos SET stock = stock + ? WHERE id = ?")->execute([$qty, $pid]);
        registrar_movimiento($pdo, $pid, "entrada_compra", $qty, "ingreso manual (escáner)", $user["id"]);
        $pdo->commit();
        send_json(one_row($pdo, "SELECT * FROM productos WHERE id = ?", [$pid]));
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_json(["error" => $e->getMessage()], 400);
    }
}
if ($method === "POST" && $path === "/compras") {
    require_user($pdo, ["administrador", "bodeguero"]);
    $detalle = $body["detalle"] ?? [];
    if (empty($body["proveedor_id"]) || !$detalle) {
        send_json(["error" => "Proveedor y detalle son obligatorios"], 400);
    }
    $total = 0;
    foreach ($detalle as $line) {
        $total += ((int) $line["cantidad"]) * ((float) $line["costo_unitario"]);
    }
    $pdo->beginTransaction();
    try {
        $pdo->prepare("INSERT INTO compras (proveedor_id, usuario_id, total, estado) VALUES (?,?,?,'registrada')")
            ->execute([$body["proveedor_id"], $user["id"], $total]);
        $compraId = (int) $pdo->lastInsertId();
        $ins = $pdo->prepare("INSERT INTO compra_detalle (compra_id, producto_id, cantidad, costo_unitario) VALUES (?,?,?,?)");
        $up = $pdo->prepare("UPDATE productos SET stock = stock + ? WHERE id = ?");
        foreach ($detalle as $line) {
            $pid = (int) $line["producto_id"];
            $qty = (int) $line["cantidad"];
            $ins->execute([$compraId, $pid, $qty, $line["costo_unitario"]]);
            $up->execute([$qty, $pid]);
            registrar_movimiento($pdo, $pid, "entrada_compra", $qty, "compra #$compraId", $user["id"]);
        }
        $pdo->commit();
        send_json(one_row($pdo, "SELECT * FROM compras WHERE id = ?", [$compraId]), 201);
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_json(["error" => $e->getMessage()], 500);
    }
}

if ($method === "POST" && $path === "/pedidos") {
    require_user($pdo, ["administrador", "bodeguero"]);
    $detalle = $body["detalle"] ?? [];
    if (empty($body["cliente_id"]) || !$detalle) {
        send_json(["error" => "Cliente y productos son obligatorios"], 400);
    }
    $pdo->beginTransaction();
    try {
        $total = 0;
        foreach ($detalle as $line) {
            $prod = one_row($pdo, "SELECT nombre, stock FROM productos WHERE id = ? FOR UPDATE", [$line["producto_id"]]);
            if (!$prod || (int) $prod["stock"] < (int) $line["cantidad"]) {
                throw new RuntimeException("Stock insuficiente: " . ($prod["nombre"] ?? "producto"));
            }
            $total += ((int) $line["cantidad"]) * ((float) $line["precio_unitario"]);
        }
        $pdo->prepare("INSERT INTO pedidos (cliente_id, usuario_id, total, notas, estado, stock_descontado) VALUES (?,?,?,?,'pendiente',1)")
            ->execute([(int) $body["cliente_id"], $user["id"], $total, $body["notas"] ?? ""]);
        $pedidoId = (int) $pdo->lastInsertId();
        $ins = $pdo->prepare("INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?,?,?,?)");
        $down = $pdo->prepare("UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?");
        foreach ($detalle as $line) {
            $pid = (int) $line["producto_id"];
            $qty = (int) $line["cantidad"];
            $ins->execute([$pedidoId, $pid, $qty, $line["precio_unitario"]]);
            $down->execute([$qty, $pid, $qty]);
            if ($down->rowCount() === 0) {
                throw new RuntimeException("No se pudo descontar stock del producto $pid");
            }
            registrar_movimiento($pdo, $pid, "salida_pedido", $qty, "pedido #$pedidoId", $user["id"]);
        }
        $pdo->commit();
        send_json(one_row($pdo, "SELECT * FROM pedidos WHERE id = ?", [$pedidoId]), 201);
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_json(["error" => $e->getMessage()], 400);
    }
}

if ($method === "PATCH" && preg_match("#^/pedidos/(\d+)/estado$#", $path, $m)) {
    require_user($pdo, ["administrador", "bodeguero"]);
    $estado = $body["estado"] ?? "";
    $pdo->beginTransaction();
    try {
        $pedido = one_row($pdo, "SELECT * FROM pedidos WHERE id = ? FOR UPDATE", [(int) $m[1]]);
        if (!$pedido) {
            throw new RuntimeException("Pedido no encontrado");
        }
        $detalle = all_rows($pdo, "SELECT * FROM pedido_detalle WHERE pedido_id = ?", [$pedido["id"]]);
        $stockDescontado = (int) $pedido["stock_descontado"];
        $debe = in_array($estado, ["en_picking", "listo", "en_ruta", "entregado"], true);
        if ($debe && !$stockDescontado) {
            foreach ($detalle as $line) {
                $prod = one_row($pdo, "SELECT nombre, stock FROM productos WHERE id = ? FOR UPDATE", [$line["producto_id"]]);
                if (!$prod || (int) $prod["stock"] < (int) $line["cantidad"]) {
                    throw new RuntimeException("Stock insuficiente: " . ($prod["nombre"] ?? "producto"));
                }
            }
            foreach ($detalle as $line) {
                $pdo->prepare("UPDATE productos SET stock = stock - ? WHERE id = ?")->execute([$line["cantidad"], $line["producto_id"]]);
            }
            $stockDescontado = 1;
        }
        if ($estado === "cancelado" && $stockDescontado) {
            foreach ($detalle as $line) {
                $pid = (int) $line["producto_id"];
                $qty = (int) $line["cantidad"];
                $pdo->prepare("UPDATE productos SET stock = stock + ? WHERE id = ?")->execute([$qty, $pid]);
                registrar_movimiento($pdo, $pid, "devolucion_cancelado", $qty, "pedido #{$pedido["id"]}", $user["id"]);
            }
            $stockDescontado = 0;
        }
        $pdo->prepare("UPDATE pedidos SET estado = ?, stock_descontado = ? WHERE id = ?")
            ->execute([$estado, $stockDescontado, $pedido["id"]]);
        $pdo->commit();
        send_json(one_row($pdo, "SELECT * FROM pedidos WHERE id = ?", [$pedido["id"]]));
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_json(["error" => $e->getMessage()], 400);
    }
}

if ($method === "POST" && $path === "/rutas") {
    require_user($pdo, ["administrador"]);
    $ids = $body["pedido_ids"] ?? [];
    if (empty($body["vehiculo_id"]) || empty($body["conductor_id"]) || !$ids) {
        send_json(["error" => "Vehículo, conductor y pedidos son obligatorios"], 400);
    }
    $pdo->beginTransaction();
    try {
        $pdo->prepare("INSERT INTO rutas (vehiculo_id, conductor_id, fecha, estado, polyline, distancia_km) VALUES (?,?,?,'en_despacho',?,?)")
            ->execute([
                $body["vehiculo_id"],
                $body["conductor_id"],
                $body["fecha"] ?? date("Y-m-d"),
                empty($body["polyline"]) ? null : json_encode($body["polyline"]),
                $body["distancia_km"] ?? null,
            ]);
        $rutaId = (int) $pdo->lastInsertId();
        $ins = $pdo->prepare("INSERT INTO ruta_paradas (ruta_id, pedido_id, orden, estado) VALUES (?,?,?,'en_despacho')");
        foreach ($ids as $i => $pedidoId) {
            $ins->execute([$rutaId, $pedidoId, $i + 1]);
            $pdo->prepare("UPDATE pedidos SET estado = 'en_ruta' WHERE id = ?")->execute([$pedidoId]);
        }
        $pdo->prepare("UPDATE vehiculos SET conductor_id = ? WHERE id = ?")
            ->execute([$body["conductor_id"], $body["vehiculo_id"]]);
        $pdo->commit();
        send_json(one_row($pdo, "SELECT * FROM rutas WHERE id = ?", [$rutaId]), 201);
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_json(["error" => $e->getMessage()], 400);
    }
}

if ($method === "POST" && preg_match("#^/rutas/(\\d+)/pedidos$#", $path, $m)) {
    require_user($pdo, ["administrador"]);
    $ids = $body["pedido_ids"] ?? [];
    if (!$ids) {
        send_json(["error" => "Selecciona pedidos listos"], 400);
    }
    $pdo->beginTransaction();
    try {
        $ruta = one_row($pdo, "SELECT * FROM rutas WHERE id = ? FOR UPDATE", [(int) $m[1]]);
        if (!$ruta) {
            throw new RuntimeException("Ruta no encontrada");
        }
        $orden = (int) (one_row($pdo, "SELECT COALESCE(MAX(orden),0) AS n FROM ruta_paradas WHERE ruta_id = ?", [$ruta["id"]])["n"] ?? 0);
        $paradaEstado = in_array($ruta["estado"], ["en_ruta", "en_curso"], true) ? "en_ruta" : "en_despacho";
        $ins = $pdo->prepare("INSERT INTO ruta_paradas (ruta_id, pedido_id, orden, estado) VALUES (?,?,?,?)");
        foreach ($ids as $pedidoId) {
            $orden++;
            $ins->execute([$ruta["id"], $pedidoId, $orden, $paradaEstado]);
            $pdo->prepare("UPDATE pedidos SET estado = 'en_ruta' WHERE id = ?")->execute([$pedidoId]);
        }
        $pdo->commit();
        send_json(["ok" => true]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_json(["error" => $e->getMessage()], 400);
    }
}

if ($method === "PATCH" && preg_match("#^/rutas/(\\d+)/estado$#", $path, $m)) {
    require_user($pdo, ["administrador", "conductor"]);
    $estado = $body["estado"] ?? "en_despacho";
    if ($estado === "planificada") {
        $estado = "en_despacho";
    }
    if ($estado === "en_curso") {
        $estado = "en_ruta";
    }
    if ($estado === "completada") {
        $estado = "entregado";
    }
    $pdo->beginTransaction();
    try {
        $ruta = one_row($pdo, "SELECT * FROM rutas WHERE id = ? FOR UPDATE", [(int) $m[1]]);
        if (!$ruta) {
            throw new RuntimeException("Ruta no encontrada");
        }
        if ($user["rol"] === "conductor" && bint($ruta["conductor_id"]) !== bint($user["id"])) {
            throw new RuntimeException("Esta ruta no está asignada a tu usuario");
        }
        $pdo->prepare("UPDATE rutas SET estado = ? WHERE id = ?")->execute([$estado, $ruta["id"]]);
        if ($estado === "en_ruta") {
            $pdo->prepare("UPDATE ruta_paradas SET estado = 'en_ruta' WHERE ruta_id = ? AND estado <> 'entregado'")
                ->execute([$ruta["id"]]);
            $pdo->prepare("UPDATE vehiculos SET estado = 'en_ruta', conductor_id = ? WHERE id = ?")
                ->execute([$ruta["conductor_id"], $ruta["vehiculo_id"]]);
        }
        if ($estado === "entregado") {
            $pdo->prepare("UPDATE ruta_paradas SET estado = 'entregado', entregado_en = COALESCE(entregado_en, NOW()) WHERE ruta_id = ?")
                ->execute([$ruta["id"]]);
            $pdo->prepare("UPDATE pedidos p JOIN ruta_paradas rp ON rp.pedido_id = p.id SET p.estado = 'entregado' WHERE rp.ruta_id = ?")
                ->execute([$ruta["id"]]);
            $pdo->prepare("UPDATE vehiculos SET estado = 'disponible' WHERE id = ?")->execute([$ruta["vehiculo_id"]]);
        }
        $pdo->commit();
        send_json(["ok" => true, "estado" => $estado]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_json(["error" => $e->getMessage()], 400);
    }
}

if ($method === "PATCH" && preg_match("#^/rutas/(\\d+)/paradas$#", $path, $m)) {
    require_user($pdo, ["administrador", "conductor"]);
    $pdo->beginTransaction();
    try {
        $ruta = one_row($pdo, "SELECT * FROM rutas WHERE id = ? FOR UPDATE", [(int) $m[1]]);
        if (!$ruta) {
            throw new RuntimeException("Ruta no encontrada");
        }
        if ($user["rol"] === "conductor" && bint($ruta["conductor_id"]) !== bint($user["id"])) {
            throw new RuntimeException("Esta ruta no está asignada a tu usuario");
        }
        $estado = $body["estado"] ?? "en_despacho";
        if ($estado === "pendiente") {
            $estado = "en_despacho";
        }
        $pedidoId = $body["pedido_id"] ?? 0;
        $pdo->prepare("UPDATE ruta_paradas SET estado = ?, entregado_en = IF(? = 'entregado', NOW(), NULL) WHERE ruta_id = ? AND pedido_id = ?")
            ->execute([$estado, $estado, $ruta["id"], $pedidoId]);
        if ($estado === "entregado") {
            $pdo->prepare("UPDATE pedidos SET estado = 'entregado' WHERE id = ?")->execute([$pedidoId]);
        } else {
            $pdo->prepare("UPDATE pedidos SET estado = 'en_ruta' WHERE id = ?")->execute([$pedidoId]);
        }
        $pending = one_row(
            $pdo,
            "SELECT COUNT(*) AS n FROM ruta_paradas WHERE ruta_id = ? AND estado NOT IN ('entregado')",
            [$ruta["id"]]
        );
        if ((int) $pending["n"] === 0) {
            $pdo->prepare("UPDATE rutas SET estado = 'entregado' WHERE id = ?")->execute([$ruta["id"]]);
            $pdo->prepare("UPDATE vehiculos SET estado = 'disponible' WHERE id = ?")->execute([$ruta["vehiculo_id"]]);
        } elseif ($estado === "en_ruta") {
            $pdo->prepare("UPDATE rutas SET estado = 'en_ruta' WHERE id = ? AND estado IN ('en_despacho','planificada')")
                ->execute([$ruta["id"]]);
        }
        $pdo->commit();
        send_json(["ok" => true]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        send_json(["error" => $e->getMessage()], 400);
    }
}

send_json(["error" => "Ruta no encontrada"], 404);
