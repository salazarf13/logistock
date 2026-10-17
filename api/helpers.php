<?php

function pdo_connect(?string $database = "logistock"): PDO
{
    $cfg = require __DIR__ . "/config.php";
    $db = $database === null ? "" : ";dbname={$database}";
    $dsn = "mysql:host={$cfg["host"]};port={$cfg["port"]}{$db};charset=utf8mb4";
    return new PDO($dsn, $cfg["user"], $cfg["pass"], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

function ensure_schema(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS movimientos_inventario (
      id INT AUTO_INCREMENT PRIMARY KEY,
      producto_id INT NOT NULL,
      tipo ENUM('entrada_compra','salida_pedido','devolucion_cancelado') NOT NULL,
      cantidad INT NOT NULL,
      referencia VARCHAR(80),
      usuario_id INT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )");
    try {
        $pdo->exec("ALTER TABLE rutas MODIFY estado VARCHAR(20) NOT NULL DEFAULT 'en_despacho'");
        $pdo->exec("UPDATE rutas SET estado = 'en_despacho' WHERE estado IN ('planificada')");
        $pdo->exec("UPDATE rutas SET estado = 'en_ruta' WHERE estado IN ('en_curso')");
        $pdo->exec("UPDATE rutas SET estado = 'entregado' WHERE estado IN ('completada')");
        $pdo->exec("ALTER TABLE ruta_paradas MODIFY estado VARCHAR(20) NOT NULL DEFAULT 'en_despacho'");
        $pdo->exec("UPDATE ruta_paradas SET estado = 'en_despacho' WHERE estado IN ('pendiente')");
    } catch (Throwable $e) {
        /* tablas aún no creadas */
    }
}

function registrar_movimiento(PDO $pdo, int $productoId, string $tipo, int $cantidad, string $referencia, $usuarioId): void
{
    $pdo->prepare(
        "INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, referencia, usuario_id) VALUES (?,?,?,?,?)"
    )->execute([$productoId, $tipo, $cantidad, $referencia, $usuarioId]);
}

function json_input(): array
{
    $raw = file_get_contents("php://input");
    $data = json_decode($raw ?: "[]", true);
    return is_array($data) ? $data : [];
}

function send_json($data, int $code = 200): void
{
    http_response_code($code);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function cors(): void
{
    header("Access-Control-Allow-Origin: http://localhost:5173");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS");
    if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
        http_response_code(204);
        exit;
    }
}

function bint($v): int
{
    return (int) $v;
}

function bfloat($v): float
{
    return $v === null ? 0.0 : (float) $v;
}

function bbool($v): bool
{
    return (int) $v === 1;
}
