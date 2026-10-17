<?php

function all_rows(PDO $pdo, string $sql, array $params = []): array
{
    $st = $pdo->prepare($sql);
    $st->execute($params);
    return $st->fetchAll();
}

function one_row(PDO $pdo, string $sql, array $params = []): ?array
{
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $row = $st->fetch();
    return $row ?: null;
}

function list_categorias(PDO $pdo): array
{
    return all_rows($pdo, "SELECT * FROM categorias ORDER BY nombre");
}

function list_proveedores(PDO $pdo): array
{
    return all_rows($pdo, "SELECT * FROM proveedores ORDER BY nombre");
}

function list_clientes(PDO $pdo): array
{
    $rows = all_rows($pdo, "SELECT * FROM clientes ORDER BY nombre");
    foreach ($rows as &$c) {
        $c["lat"] = bfloat($c["lat"]);
        $c["lng"] = bfloat($c["lng"]);
    }
    return $rows;
}

function list_usuarios(PDO $pdo): array
{
    $rows = all_rows($pdo, "SELECT id, nombre, email, rol, telefono, activo FROM usuarios ORDER BY id");
    foreach ($rows as &$u) {
        $u["activo"] = bbool($u["activo"]);
        $u["id"] = bint($u["id"]);
    }
    return $rows;
}

function list_productos(PDO $pdo): array
{
    $rows = all_rows($pdo, "SELECT * FROM productos ORDER BY nombre");
    foreach ($rows as &$p) {
        $p["id"] = bint($p["id"]);
        $p["precio_compra"] = bfloat($p["precio_compra"]);
        $p["precio_venta"] = bfloat($p["precio_venta"]);
        $p["stock"] = bint($p["stock"]);
        $p["stock_minimo"] = bint($p["stock_minimo"]);
        $p["activo"] = bbool($p["activo"]);
    }
    return $rows;
}

function list_compras(PDO $pdo): array
{
    $compras = all_rows($pdo, "SELECT * FROM compras ORDER BY id DESC");
    foreach ($compras as &$c) {
        $c["id"] = bint($c["id"]);
        $c["total"] = bfloat($c["total"]);
        $c["detalle"] = all_rows(
            $pdo,
            "SELECT producto_id, cantidad, costo_unitario FROM compra_detalle WHERE compra_id = ?",
            [$c["id"]]
        );
        foreach ($c["detalle"] as &$d) {
            $d["producto_id"] = bint($d["producto_id"]);
            $d["cantidad"] = bint($d["cantidad"]);
            $d["costo_unitario"] = bfloat($d["costo_unitario"]);
        }
    }
    return $compras;
}

function list_pedidos(PDO $pdo): array
{
    $pedidos = all_rows($pdo, "SELECT * FROM pedidos ORDER BY id");
    foreach ($pedidos as &$p) {
        $p["id"] = bint($p["id"]);
        $p["total"] = bfloat($p["total"]);
        $p["stock_descontado"] = bbool($p["stock_descontado"]);
        $p["detalle"] = all_rows(
            $pdo,
            "SELECT producto_id, cantidad, precio_unitario FROM pedido_detalle WHERE pedido_id = ?",
            [$p["id"]]
        );
        foreach ($p["detalle"] as &$d) {
            $d["producto_id"] = bint($d["producto_id"]);
            $d["cantidad"] = bint($d["cantidad"]);
            $d["precio_unitario"] = bfloat($d["precio_unitario"]);
        }
    }
    return $pedidos;
}

function list_vehiculos(PDO $pdo): array
{
    $rows = all_rows($pdo, "SELECT * FROM vehiculos ORDER BY id");
    foreach ($rows as &$v) {
        $v["id"] = bint($v["id"]);
        $v["capacidad_kg"] = $v["capacidad_kg"] === null ? null : bint($v["capacidad_kg"]);
        $v["conductor_id"] = $v["conductor_id"] === null ? null : bint($v["conductor_id"]);
    }
    return $rows;
}

function list_rutas(PDO $pdo, ?int $conductorId = null): array
{
    $sql = "SELECT * FROM rutas";
    $params = [];
    if ($conductorId) {
        $sql .= " WHERE conductor_id = ?";
        $params[] = $conductorId;
    }
    $sql .= " ORDER BY id DESC";
    $rutas = all_rows($pdo, $sql, $params);
    foreach ($rutas as &$r) {
        $r["id"] = bint($r["id"]);
        $r["distancia_km"] = $r["distancia_km"] === null ? null : bfloat($r["distancia_km"]);
        $decoded = $r["polyline"] ? json_decode($r["polyline"], true) : null;
        $r["polyline"] = is_array($decoded) ? $decoded : null;
        $r["paradas"] = all_rows(
            $pdo,
            "SELECT pedido_id, orden, estado, entregado_en FROM ruta_paradas WHERE ruta_id = ? ORDER BY orden",
            [$r["id"]]
        );
        foreach ($r["paradas"] as &$p) {
            $p["pedido_id"] = bint($p["pedido_id"]);
            $p["orden"] = bint($p["orden"]);
        }
    }
    return $rutas;
}

function bootstrap(PDO $pdo, array $user): array
{
    $rutas = $user["rol"] === "conductor" ? list_rutas($pdo, bint($user["id"])) : list_rutas($pdo);
    return [
        "categorias" => list_categorias($pdo),
        "proveedores" => list_proveedores($pdo),
        "clientes" => list_clientes($pdo),
        "productos" => list_productos($pdo),
        "compras" => list_compras($pdo),
        "pedidos" => list_pedidos($pdo),
        "vehiculos" => list_vehiculos($pdo),
        "rutas" => $rutas,
        "usuarios" => list_usuarios($pdo),
    ];
}

function upsert_row(PDO $pdo, string $table, array $fields, array $body, ?int $id): array
{
    $allowed = [];
    $values = [];
    foreach ($fields as $f) {
        if (array_key_exists($f, $body)) {
            $allowed[] = $f;
            $values[] = $body[$f] === "" ? null : $body[$f];
        }
    }
    if (!$allowed) {
        send_json(["error" => "Sin datos"], 400);
    }
    try {
        if ($id) {
            $sets = implode(", ", array_map(fn($c) => "$c = ?", $allowed));
            $values[] = $id;
            $pdo->prepare("UPDATE $table SET $sets WHERE id = ?")->execute($values);
            $row = one_row($pdo, "SELECT * FROM $table WHERE id = ?", [$id]);
            if (!$row) {
                send_json(["error" => "No encontrado"], 404);
            }
            return $row;
        }
        $cols = implode(",", $allowed);
        $marks = implode(",", array_fill(0, count($allowed), "?"));
        $pdo->prepare("INSERT INTO $table ($cols) VALUES ($marks)")->execute($values);
        return one_row($pdo, "SELECT * FROM $table WHERE id = ?", [(int) $pdo->lastInsertId()]);
    } catch (Throwable $e) {
        send_json(["error" => "No se pudo guardar en $table"], 400);
    }
}
