# LogiStock

Sistema de gestión de inventarios, logística y rutas de despacho.

**Universidad Mariano Gálvez de Guatemala** — Análisis de Sistemas II  
German Emmanuel Salazar Figueroa — Carnet 1490-23-16968

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express + JWT
- Base de datos: PostgreSQL (PostGIS si el contenedor lo incluye)
- Mapas: Leaflet + OpenStreetMap
- Rutas: OSRM
- Códigos de barras: JsBarcode + html5-qrcode

## Cómo ejecutar con XAMPP (PHP + MySQL)

PHP **no** es la base de datos. En XAMPP la base es **MySQL/MariaDB**. PHP se conecta con PDO.

1. En el panel de XAMPP inicia **Apache** (opcional) y **MySQL**.
2. Crea la base y los datos de prueba:

```bat
C:\xampp\php\php.exe api\install.php
```

3. Arranca la API PHP (mismo puerto que usa el frontend):

```bat
api\start-api.bat
```

O a mano:

```bat
C:\xampp\php\php.exe -S localhost:4000 api\index.php
```

4. En otra terminal, el frontend:

```bat
cd frontend
npm run dev
```

Abre http://localhost:5173

La conexión está en `api/config.php`:

- host `127.0.0.1`
- puerto `3306`
- usuario `root`
- contraseña vacía (por defecto de XAMPP)
- base `logistock`

Si cambiaste la clave de root en phpMyAdmin, edita `api/config.php`.

Abre http://localhost:5173

Si el API no está encendido, el login entra en **modo local** (datos en el navegador).

### Usuarios de prueba

| Rol           | Correo                 | Contraseña   |
|---------------|------------------------|--------------|
| Administrador | admin@logistock.com    | admin123     |
| Bodeguero     | bodega@logistock.com   | bodega123    |
| Conductor     | conductor@logistock.com| conductor123 |
