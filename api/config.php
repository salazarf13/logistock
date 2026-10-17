<?php
/**
 * Conexión a MySQL (XAMPP).
 * PHP no es la base de datos: PHP abre una conexión PDO hacia MySQL/MariaDB.
 *
 * Por defecto XAMPP usa:
 *   host: 127.0.0.1
 *   usuario: root
 *   contraseña: (vacía)
 *   base: logistock
 */
return [
    "host" => getenv("LOGISTOCK_DB_HOST") ?: "127.0.0.1",
    "port" => getenv("LOGISTOCK_DB_PORT") ?: "3306",
    "name" => getenv("LOGISTOCK_DB_NAME") ?: "logistock",
    "user" => getenv("LOGISTOCK_DB_USER") ?: "root",
    "pass" => getenv("LOGISTOCK_DB_PASS") !== false ? getenv("LOGISTOCK_DB_PASS") : "",
    "jwt"  => getenv("LOGISTOCK_JWT") ?: "logistock-dev-secret-cambia-esto",
];
