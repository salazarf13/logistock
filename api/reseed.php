<?php
/**
 * Recarga el catálogo de telefonía en MySQL (mantiene usuarios).
 * Uso: C:\xampp\php\php.exe api\reseed.php
 */
require __DIR__ . "/helpers.php";

$cfg = require __DIR__ . "/config.php";
try {
    $pdo = pdo_connect($cfg["name"]);
} catch (Throwable $e) {
    fwrite(STDERR, "Enciende MySQL en XAMPP.\n" . $e->getMessage() . "\n");
    exit(1);
}

$nUsers = (int) $pdo->query("SELECT COUNT(*) FROM usuarios")->fetchColumn();
if ($nUsers === 0) {
    fwrite(STDERR, "Primero corre: php api\\install.php\n");
    exit(1);
}
$sql = file_get_contents(__DIR__ . "/../database/seed-telefonos.mysql.sql");
$sql = preg_replace("/^\s*--.*$/m", "", $sql);
foreach (array_filter(array_map("trim", explode(";", $sql))) as $stmt) {
    if ($stmt !== "") {
        $pdo->exec($stmt);
    }
}

$n = (int) $pdo->query("SELECT COUNT(*) FROM productos")->fetchColumn();
echo "Catálogo recargado: {$n} productos de telefonía (precios en Q, mercado GT).\n";
