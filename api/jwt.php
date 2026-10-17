<?php

function jwt_encode(array $payload, string $secret): string
{
    $payload["exp"] = time() + 60 * 60 * 12;
    $header = jwt_b64(json_encode(["typ" => "JWT", "alg" => "HS256"]));
    $body = jwt_b64(json_encode($payload));
    $sig = jwt_b64(hash_hmac("sha256", "$header.$body", $secret, true));
    return "$header.$body.$sig";
}

function jwt_decode(?string $token, string $secret): ?array
{
    if (!$token) {
        return null;
    }
    $parts = explode(".", $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$header, $body, $sig] = $parts;
    $check = jwt_b64(hash_hmac("sha256", "$header.$body", $secret, true));
    if (!hash_equals($check, $sig)) {
        return null;
    }
    $payload = json_decode(jwt_unb64($body), true);
    if (!is_array($payload) || ($payload["exp"] ?? 0) < time()) {
        return null;
    }
    return $payload;
}

function jwt_b64(string $data): string
{
    return rtrim(strtr(base64_encode($data), "+/", "-_"), "=");
}

function jwt_unb64(string $data): string
{
    $pad = strlen($data) % 4;
    if ($pad) {
        $data .= str_repeat("=", 4 - $pad);
    }
    return base64_decode(strtr($data, "-_", "+/")) ?: "";
}

function bearer_token(): ?string
{
    $header = $_SERVER["HTTP_AUTHORIZATION"] ?? "";
    if (stripos($header, "Bearer ") === 0) {
        return substr($header, 7);
    }
    return null;
}

function require_user(PDO $pdo, array $roles = []): array
{
    $cfg = require __DIR__ . "/config.php";
    $payload = jwt_decode(bearer_token(), $cfg["jwt"]);
    if (!$payload) {
        send_json(["error" => "No autenticado"], 401);
    }
    if ($roles && !in_array($payload["rol"], $roles, true)) {
        send_json(["error" => "Sin permiso para este módulo"], 403);
    }
    return $payload;
}
