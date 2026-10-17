<?php
/**
 * Crea la base logistock en MySQL (XAMPP) y carga datos de demostración.
 * Uso: C:\xampp\php\php.exe api\install.php
 */

require __DIR__ . "/helpers.php";

$cfg = require __DIR__ . "/config.php";

try {
    $root = pdo_connect(null);
} catch (Throwable $e) {
    fwrite(STDERR, "No se pudo conectar a MySQL. Enciende MySQL en el panel de XAMPP.\n");
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}

$root->exec("CREATE DATABASE IF NOT EXISTS `{$cfg["name"]}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$pdo = pdo_connect($cfg["name"]);
$sql = file_get_contents(__DIR__ . "/../database/schema.mysql.sql");
$sql = preg_replace("/^\s*--.*$/m", "", $sql);
foreach (array_filter(array_map("trim", explode(";", $sql))) as $stmt) {
    if ($stmt !== "") {
        $pdo->exec($stmt);
    }
}

$count = (int) $pdo->query("SELECT COUNT(*) FROM usuarios")->fetchColumn();
if ($count > 0) {
    echo "La base ya tenía usuarios. No se duplicó el seed.\n";
    echo "Conexión OK → mysql://{$cfg["user"]}@{$cfg["host"]}:{$cfg["port"]}/{$cfg["name"]}\n";
    exit(0);
}

$admin = password_hash("admin123", PASSWORD_BCRYPT);
$bodega = password_hash("bodega123", PASSWORD_BCRYPT);
$cond = password_hash("conductor123", PASSWORD_BCRYPT);

$pdo->prepare("INSERT INTO usuarios (nombre, email, password_hash, rol, telefono) VALUES
    ('German Salazar', 'admin@logistock.com', ?, 'administrador', '7761-0001'),
    ('María López', 'bodega@logistock.com', ?, 'bodeguero', '7761-0002'),
    ('Carlos Méndez', 'conductor@logistock.com', ?, 'conductor', '7761-0003')")
    ->execute([$admin, $bodega, $cond]);

$sqlSeed = file_get_contents(__DIR__ . "/../database/seed-telefonos.mysql.sql");
$sqlSeed = preg_replace("/^\s*--.*$/m", "", $sqlSeed);
foreach (array_filter(array_map("trim", explode(";", $sqlSeed))) as $stmt) {
    if ($stmt !== "") {
        $pdo->exec($stmt);
    }
}

echo "Base logistock creada y cargada (catálogo de telefonía).\n";
echo "Conexión → mysql://{$cfg["user"]}@{$cfg["host"]}:{$cfg["port"]}/{$cfg["name"]}\n";
echo "Cuentas: admin@logistock.com / admin123\n";
