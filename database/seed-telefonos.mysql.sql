SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE ruta_paradas;
TRUNCATE TABLE rutas;
TRUNCATE TABLE pedido_detalle;
TRUNCATE TABLE pedidos;
TRUNCATE TABLE compra_detalle;
TRUNCATE TABLE compras;
TRUNCATE TABLE productos;
TRUNCATE TABLE clientes;
TRUNCATE TABLE proveedores;
TRUNCATE TABLE categorias;
TRUNCATE TABLE vehiculos;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO categorias (id, nombre, descripcion) VALUES
  (1, 'Apple', 'iPhone y accesorios Apple'),
  (2, 'Samsung', 'Galaxy A, S, Z Fold y Flip'),
  (3, 'Xiaomi / POCO', 'Redmi, POCO y Xiaomi T'),
  (4, 'Motorola', 'Moto G y Edge'),
  (5, 'Honor / Google', 'Honor y Pixel'),
  (6, 'Accesorios', 'Cables, fundas, audífonos y power bank');

INSERT INTO proveedores (id, nombre, nit, telefono, email, direccion) VALUES
  (1, 'Importadora TecnoGT', '5482103-5', '7761-4400', 'ventas@tecnoGT.gt', 'C.C. Pradera Xela, Zona 3'),
  (2, 'Distribuidora Celular Max', '8123344-1', '2221-7788', 'pedidos@celularmax.gt', 'C.C. Oakland Mall, Guatemala'),
  (3, 'Accesorios del Altiplano', '3344556-8', '7765-2211', 'contacto@altiacc.gt', 'Zona 1, Quetzaltenango');

INSERT INTO clientes (id, nombre, telefono, email, direccion, lat, lng) VALUES
  (1, 'Celulares Centro Xela', '7761-2211', 'centro@celularesxela.gt', 'Parque Central, Zona 1, Xela', 14.8389, -91.5185),
  (2, 'Tecno Shop Zona 3', '7761-3344', 'zona3@tecnoshop.gt', 'Avenida Las Américas Zona 3', 14.8442, -91.5088),
  (3, 'MultiCel Salcajá', '5412-8899', 'ventas@multicel.gt', 'Salcajá, céntrico', 14.878, -91.456),
  (4, 'PhoneHouse Cantel', '7768-1010', 'cantel@phonehouse.gt', 'Cantel, mercado municipal', 14.811, -91.455);

INSERT INTO productos (id, sku, codigo_barras, nombre, descripcion, categoria_id, proveedor_id, precio_compra, precio_venta, stock, stock_minimo, unidad, activo) VALUES
  (1, 'AP-IP11-64', '1901990000011', 'iPhone 11 64 GB', 'Reacondicionado certificado · mercado GT', 1, 2, 1950, 2490, 7, 4, 'unidad', 1),
  (2, 'AP-IP12-64', '1901990000028', 'iPhone 12 64 GB', 'Cámara dual · 5G', 1, 2, 2300, 2890, 6, 4, 'unidad', 1),
  (3, 'AP-IP13-128', '1901990000035', 'iPhone 13 128 GB', 'Uno de los más vendidos en Guatemala', 1, 2, 3200, 3990, 10, 5, 'unidad', 1),
  (4, 'AP-IP14-128', '1901990000042', 'iPhone 14 128 GB', 'Chip A15', 1, 2, 3800, 4690, 8, 4, 'unidad', 1),
  (5, 'AP-IP14P-128', '1901990000059', 'iPhone 14 Pro 128 GB', 'Dynamic Island · 48 MP', 1, 2, 5200, 6490, 4, 3, 'unidad', 1),
  (6, 'AP-IP15-128', '1901990000066', 'iPhone 15 128 GB', 'USB-C · 48 MP', 1, 2, 5600, 6990, 9, 4, 'unidad', 1),
  (7, 'AP-IP15P-128', '1901990000073', 'iPhone 15 Pro 128 GB', 'Titanio · USB-C', 1, 2, 7200, 8990, 5, 3, 'unidad', 1),
  (8, 'AP-IP16-128', '1901990000080', 'iPhone 16 128 GB', 'Botón Cámara', 1, 2, 6800, 8490, 7, 4, 'unidad', 1),
  (9, 'AP-IP16PL-128', '1901990000097', 'iPhone 16 Plus 128 GB', 'Pantalla 6.7"', 1, 2, 7500, 9290, 4, 3, 'unidad', 1),
  (10, 'AP-IP16P-128', '1901990000103', 'iPhone 16 Pro 128 GB', 'Titanio · zoom 5x', 1, 2, 8900, 10990, 5, 3, 'unidad', 1),
  (11, 'AP-IP16PM-256', '1901990000110', 'iPhone 16 Pro Max 256 GB', 'Tope de gama Apple', 1, 2, 10500, 12990, 3, 3, 'unidad', 1),
  (12, 'SS-A06-64', '8806090000018', 'Samsung Galaxy A06 64 GB', 'Gama de entrada de alto volumen', 2, 1, 720, 890, 22, 10, 'unidad', 1),
  (13, 'SS-A16-128', '8806090000025', 'Samsung Galaxy A16 128 GB', 'Pantalla 90 Hz · 50 MP', 2, 1, 1100, 1390, 16, 8, 'unidad', 1),
  (14, 'SS-A26-128', '8806090000032', 'Samsung Galaxy A26 128 GB', '5G · 5000 mAh', 2, 1, 1650, 1990, 12, 6, 'unidad', 1),
  (15, 'SS-A36-128', '8806090000049', 'Samsung Galaxy A36 128 GB', 'Gama media Samsung', 2, 1, 2100, 2590, 9, 5, 'unidad', 1),
  (16, 'SS-A56-256', '8806090000056', 'Samsung Galaxy A56 256 GB', 'A serie alta', 2, 1, 2800, 3490, 8, 4, 'unidad', 1),
  (17, 'SS-S24-128', '8806090000063', 'Samsung Galaxy S24 128 GB', 'Galaxy AI', 2, 1, 5400, 6690, 6, 3, 'unidad', 1),
  (18, 'SS-S24U-256', '8806090000070', 'Samsung Galaxy S24 Ultra 256 GB', 'S Pen', 2, 1, 8200, 9990, 4, 3, 'unidad', 1),
  (19, 'SS-S25-128', '8806090000087', 'Samsung Galaxy S25 128 GB', 'Generación 2025', 2, 1, 6200, 7690, 5, 3, 'unidad', 1),
  (20, 'SS-S25U-256', '8806090000094', 'Samsung Galaxy S25 Ultra 256 GB', 'Tope de gama Samsung', 2, 1, 9200, 11490, 3, 2, 'unidad', 1),
  (21, 'SS-ZFL6-256', '8806090000100', 'Samsung Galaxy Z Flip 6 256 GB', 'Plegable compacto', 2, 2, 7800, 9690, 3, 2, 'unidad', 1),
  (22, 'SS-ZFO6-256', '8806090000117', 'Samsung Galaxy Z Fold 6 256 GB', 'Plegable tablet', 2, 2, 12500, 15490, 2, 2, 'unidad', 1),
  (23, 'XI-RA3-64', '6941810000014', 'Xiaomi Redmi A3 64 GB', 'El más económico', 3, 1, 580, 750, 20, 10, 'unidad', 1),
  (24, 'XI-R13C-128', '6941810000021', 'Xiaomi Redmi 13C 128 GB', 'Alto volumen en Xela', 3, 1, 850, 1090, 18, 8, 'unidad', 1),
  (25, 'XI-RN13-256', '6941810000038', 'Xiaomi Redmi Note 13 256 GB', 'Gama media', 3, 1, 1350, 1690, 14, 6, 'unidad', 1),
  (26, 'XI-RN14-256', '6941810000045', 'Xiaomi Redmi Note 14 256 GB', 'Note de volumen', 3, 1, 1550, 1890, 15, 6, 'unidad', 1),
  (27, 'XI-RN14P-256', '6941810000052', 'Xiaomi Redmi Note 14 Pro 256 GB', 'Cámara 200 MP', 3, 1, 2200, 2690, 8, 4, 'unidad', 1),
  (28, 'XI-PX6-256', '6941810000069', 'POCO X6 256 GB', 'Rendimiento / precio', 3, 1, 1900, 2390, 10, 5, 'unidad', 1),
  (29, 'XI-PX7P-256', '6941810000076', 'POCO X7 Pro 256 GB', 'Gama alta POCO', 3, 1, 2500, 3090, 7, 4, 'unidad', 1),
  (30, 'XI-14T-256', '6941810000083', 'Xiaomi 14T 256 GB', 'Serie T Leica', 3, 2, 3600, 4490, 5, 3, 'unidad', 1),
  (31, 'XI-14TP-512', '6941810000090', 'Xiaomi 14T Pro 512 GB', 'Tope Xiaomi T', 3, 2, 4800, 5990, 4, 2, 'unidad', 1),
  (32, 'MT-G04-64', '8100820000016', 'Motorola Moto G04 64 GB', 'Entrada Motorola', 4, 1, 650, 820, 16, 8, 'unidad', 1),
  (33, 'MT-G24-128', '8100820000023', 'Motorola Moto G24 128 GB', '90 Hz', 4, 1, 950, 1190, 12, 6, 'unidad', 1),
  (34, 'MT-G54-256', '8100820000030', 'Motorola Moto G54 256 GB', '5G', 4, 1, 1400, 1750, 9, 5, 'unidad', 1),
  (35, 'MT-G84-256', '8100820000047', 'Motorola Moto G84 256 GB', 'P-OLED 120 Hz', 4, 1, 1800, 2250, 6, 3, 'unidad', 1),
  (36, 'MT-E50F-256', '8100820000054', 'Motorola Edge 50 Fusion 256 GB', 'IP68', 4, 2, 2800, 3490, 5, 3, 'unidad', 1),
  (37, 'MT-E50P-256', '8100820000061', 'Motorola Edge 50 Pro 256 GB', 'Gama alta Motorola', 4, 2, 3600, 4490, 4, 2, 'unidad', 1),
  (38, 'HN-X5B-64', '6901440000018', 'Honor X5b 64 GB', 'Entrada Honor', 5, 1, 620, 790, 14, 7, 'unidad', 1),
  (39, 'HN-X6B-128', '6901440000025', 'Honor X6b 128 GB', 'Batería grande', 5, 1, 850, 1090, 11, 6, 'unidad', 1),
  (40, 'HN-X8B-256', '6901440000032', 'Honor X8b 256 GB', 'AMOLED', 5, 1, 1400, 1750, 8, 4, 'unidad', 1),
  (41, 'HN-200-256', '6901440000049', 'Honor 200 256 GB', 'Gama media-alta', 5, 2, 2400, 2990, 6, 3, 'unidad', 1),
  (42, 'HN-200P-512', '6901440000056', 'Honor 200 Pro 512 GB', 'Tope Honor 200', 5, 2, 3800, 4690, 3, 2, 'unidad', 1),
  (43, 'GG-P8A-128', '0840030000012', 'Google Pixel 8a 128 GB', 'Tensor · foto Google', 5, 2, 3800, 4690, 4, 2, 'unidad', 1),
  (44, 'GG-P9-128', '0840030000029', 'Google Pixel 9 128 GB', 'Gemini Nano', 5, 2, 6200, 7690, 3, 2, 'unidad', 1),
  (45, 'AC-CARG-25W', '7501234500451', 'Cargador USB-C 25W', 'Carga rápida', 6, 3, 45, 85, 40, 15, 'unidad', 1),
  (46, 'AC-CABLE-C', '7501234500468', 'Cable USB-C 1 m', 'Nylon · 60 W', 6, 3, 18, 35, 55, 20, 'unidad', 1),
  (47, 'AC-FUNDA-SIL', '7501234500475', 'Funda silicona universal', 'Tallas A / Note / G', 6, 3, 25, 55, 30, 12, 'unidad', 1),
  (48, 'AC-BUDS-FE', '8806090000483', 'Samsung Galaxy Buds FE', 'Audífonos inalámbricos', 6, 1, 420, 590, 8, 5, 'unidad', 1),
  (49, 'AC-AIRP4', '1901990000493', 'Apple AirPods 4', 'USB-C', 6, 2, 980, 1290, 6, 4, 'unidad', 1),
  (50, 'AC-PB-20K', '7501234500505', 'Power bank 20 000 mAh', '2 puertos', 6, 3, 95, 165, 18, 8, 'unidad', 1);

INSERT INTO vehiculos (id, placa, marca, modelo, capacidad_kg, conductor_id, estado) VALUES
  (1, 'P-458GT', 'Toyota', 'Hilux', 1000, 3, 'disponible'),
  (2, 'C-902QL', 'Isuzu', 'NPR', 3500, NULL, 'mantenimiento');

INSERT INTO compras (id, proveedor_id, usuario_id, total, estado) VALUES (1, 1, 2, 13000, 'registrada');
INSERT INTO compra_detalle (compra_id, producto_id, cantidad, costo_unitario) VALUES (1, 12, 10, 720), (1, 23, 10, 580);

INSERT INTO pedidos (id, cliente_id, usuario_id, total, notas, estado, stock_descontado) VALUES
  (1, 1, 1, 1460, 'Entregar antes de las 11:00', 'en_ruta', 1),
  (2, 2, 1, 1890, 'Color negro', 'pendiente', 0),
  (3, 3, 1, 1245, 'Llamar al llegar', 'en_ruta', 1);
INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, precio_unitario) VALUES
  (1, 13, 1, 1390), (1, 46, 2, 35),
  (2, 26, 1, 1890),
  (3, 33, 1, 1190), (3, 47, 1, 55);

INSERT INTO rutas (id, vehiculo_id, conductor_id, fecha, estado) VALUES (1, 1, 3, CURDATE(), 'en_despacho');
INSERT INTO ruta_paradas (ruta_id, pedido_id, orden, estado) VALUES (1, 1, 1, 'en_despacho'), (1, 3, 2, 'en_despacho');
