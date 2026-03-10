# Universidad del Valle de Guatemala
## Departamento de Computación
## CC3089 Bases de Datos 2
### Proyecto No. 1

### Cristian Tunchez
### Angie Vela
### Paula De León

# Backend de Plataforma de Restaurantes

Un backend completo de plataforma de pedidos de restaurantes construido con Node.js, Express y el driver nativo de MongoDB. Demuestra características avanzadas de MongoDB incluyendo transacciones, agregaciones, GridFS, consultas geoespaciales y múltiples tipos de índices.

---

## Tabla de Contenidos

- [Características](#-características)
- [Stack Tecnológico](#-stack-tecnológico)
- [Prerrequisitos](#-prerrequisitos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecutar el Proyecto](#-ejecutar-el-proyecto)
- [Estrategia de Sharding](#-estrategia-de-sharding)
- [Documentación de la API](#-documentación-de-la-api)
- [Esquema de la Base de Datos](#-esquema-de-la-base-de-datos)
- [Cobertura de Rúbrica](#-cobertura-de-rúbrica)
- [Estructura del Proyecto](#-estructura-del-proyecto)

---

## Características

### Funcionalidad Principal
- **Operaciones CRUD** — Crear, Leer, Actualizar, Eliminar completo para todas las entidades
- **Transacciones Multi-Documento** — 4 transacciones ACID para órdenes y reseñas
- **Almacenamiento de Archivos GridFS** — Subir y gestionar imágenes de restaurantes/menús
- **Consultas Geoespaciales** — Encontrar restaurantes cerca de la ubicación del usuario
- **Búsqueda de Texto** — Búsqueda de texto completo en ítems del menú
- **Agregaciones Complejas** — Pipelines de análisis con $lookup, $unwind, $group
- **Sharding Horizontal** — Clave de fragmentación compuesta para escalabilidad de la colección de órdenes

### Características Avanzadas de MongoDB
- **6 Tipos de Índices**
  - Simple (users.email)
  - Compuesto (orders: restaurant + status + date)
  - Índice de Clave de Fragmentación (orders: restaurantId + createdAt)
  - Geoespacial (2dsphere para ubicaciones)
  - Texto (búsqueda de ítems del menú)
  - Multikey (array de etiquetas de restaurantes)
- **Configuración de Sharding** — Clave de fragmentación compuesta { restaurantId: 1, createdAt: 1 }
- **Operaciones BulkWrite** — Operaciones mixtas (updateMany, updateOne, deleteMany) en una sola llamada
- **Operaciones de Arrays** — $push, $pull, $addToSet en arrays embebidos
- **Documentos Embebidos** — Dirección, horario, ítems de orden
- **Documentos Referenciados** — Usuarios, restaurantes, ítems del menú
- **Más de 50,000 Documentos** — Datos de órdenes generados para pruebas

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| Runtime | Node.js | ≥ 20 LTS |
| Framework | Express | ^4.18 |
| Base de Datos | MongoDB | 6.x+ |
| Driver | Driver Nativo de MongoDB | ^6.3 |
| Carga de Archivos | Multer | ^1.4 |
| Config. de Env | Dotenv | ^16 |
| Herramientas Dev | Nodemon | ^3.0 |
| Generación de Datos | Faker | ^8.3 |

> **¿Por qué el Driver Nativo?** La rúbrica evalúa operaciones directas de MongoDB (explain(), transacciones, GridFS). El driver nativo proporciona control explícito sobre todas las características de MongoDB.

---

## Prerrequisitos

- **Node.js** ≥ 20.x ([Descargar](https://nodejs.org/))
- **MongoDB Atlas** cuenta (o MongoDB local ≥ 6.0)
  - [Crear cluster gratuito](https://www.mongodb.com/cloud/atlas/register)
- **Git** (para clonar)

---

## Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd restaurant_platform
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   # Copiar archivo .env y actualizar con tu URI de MongoDB
   cp .env .env
   ```
   
   Editar `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<usuario>:<contraseña>@cluster.mongodb.net/restaurant_platform
   PORT=3000
   ```

---

## Configuración

### Configuración de MongoDB Atlas

1. **Crear Cluster** (el nivel gratuito M0 es suficiente)
2. **Acceso a Base de Datos** — Crear un usuario con permisos de lectura/escritura
3. **Acceso de Red** — Agregar tu dirección IP (o `0.0.0.0/0` para pruebas)
4. **Obtener Cadena de Conexión** — Usar la opción "Connect your application"
5. **Actualizar `.env`** con tu cadena de conexión

### Colecciones Requeridas

Las siguientes colecciones se crearán automáticamente:
- `users`
- `restaurants`
- `menu_items`
- `orders`
- `reviews`
- `uploads.files` (GridFS)
- `uploads.chunks` (GridFS)

---

## Ejecutar el Proyecto

### 1. Iniciar el Servidor

```bash
npm start
# o con recarga automática
npm run dev
```

Salida esperada:
```
✓ MongoDB connected
✓ Indexes created

╔════════════════════════════════════════════════════════════╗
║  Restaurant Platform API running on port 3000       ║
╚════════════════════════════════════════════════════════════╝
```

El servidor estará disponible en: **http://localhost:3000**

### 2. Poblar la Base de Datos (Datos de Prueba)

**Importante:** Ejecutar esto una vez para generar más de 50,000 órdenes para pruebas

```bash
npm run seed
```

Esto:
- Creará 500 usuarios
- Creará 100 restaurantes
- Creará ~2,000 ítems de menú
- Creará **55,000 órdenes** (cumple requisito de rúbrica)
- Creará 2,000 reseñas
- Actualizará todas las métricas (ingresos, calificaciones, etc.)

Duración: ~30-60 segundos

### 3. Probar Rendimiento de Índices

```bash
npm run explain
```

Demuestra el rendimiento antes/después para cada tipo de índice usando el método `explain()` de MongoDB.

### 4. Ver Guía de Sharding

```bash
npm run sharding
```

Muestra la configuración de sharding e instrucciones paso a paso para habilitar el sharding horizontal en la colección `orders`. Incluye la justificación de la elección de la clave de fragmentación compuesta.

### 5. Probar Operaciones BulkWrite

```bash
# Prueba 1: Ajustes de precios del menú (operaciones mixtas)
npm run bulkwrite

# Prueba 2: Reconciliación nocturna de órdenes (operaciones updateMany)
npm run nightly-close
```

Demuestra la API `bulkWrite` con:
- **Ítems del Menú**: Operaciones mixtas (updateMany, updateOne, deleteMany)
- **Órdenes**: UpdateMany dual para reconciliación de estado

Muestra estadísticas antes/después y métricas de rendimiento. **Característica de Crédito Extra.**

---

## Estrategia de Sharding

### Resumen

La colección `orders` utiliza **sharding horizontal** con una **clave de fragmentación compuesta** para habilitar escalabilidad a través de múltiples fragmentos de MongoDB. Esto es esencial para manejar millones de órdenes a medida que la plataforma crece.

### Clave de Fragmentación: `{ restaurantId: 1, createdAt: 1 }`

#### ¿Por qué esta Clave Compuesta?

| Factor | Beneficio |
|--------|-----------|
| **Distribución de Datos** | `restaurantId` distribuye órdenes entre fragmentos basado en restaurante |
| **Consultas de Rango** | `createdAt` preserva orden cronológico para consultas de rango de fechas |
| **Eficiencia de Consultas** | La mayoría de consultas filtran por restaurante + rango de fecha (ambos en clave de fragmentación) |
| **Evitar Puntos Calientes** | Combinar restaurante + tiempo previene cuellos de botella en un solo fragmento |

#### Alternativa Considerada: Clave de Fragmentación Hash

Inicialmente se consideró `{ restaurantId: "hashed" }`, pero se rechazó porque:

- La distribución aleatoria rompe patrones de consulta temporal
- Consultas como "todas las órdenes de marzo 2026" se convierten en consultas broadcast (golpean todos los fragmentos)
- Los análisis de restaurantes pierden localidad de series temporales
- La clave compuesta balancea distribución **y** rendimiento de consultas

### Patrones de Consulta Soportados

| Consulta | ¿Fragmentos Objetivo? | Explicación |
|----------|----------------------|-------------|
| `{ restaurantId: X }` | **Dirigida** | Prefijo de clave de fragmentación → MongoDB enruta a fragmento(s) específico(s) |
| `{ restaurantId: X, createdAt: { $gte: date } }` | **Dirigida** | Clave de fragmentación completa → Fragmento único (mejor caso) |
| `{ restaurantId: X, status: "entregado" }` | **Dirigida** | Usa prefijo de clave de fragmentación + índice de estado |
| `{ createdAt: { $gte: date } }` | **Broadcast** | Falta `restaurantId` → Todos los fragmentos consultados (más lento) |
| `{ userId: X }` | **Broadcast** | No está en clave de fragmentación → Todos los fragmentos (usar índice separado) |

### Cómo Habilitar Sharding

**Prerrequisitos:**
- Cluster MongoDB Atlas **M10+** (el nivel gratuito M0 NO soporta sharding)
- O Replica Set de MongoDB con sharding habilitado

**Opción 1: Comandos de MongoDB Shell**

```bash
# Conectar a tu cluster
mongosh "mongodb+srv://cluster.mongodb.net"

# Habilitar sharding en la base de datos
sh.enableSharding("restaurant_platform")

# Fragmentar la colección orders (el índice se crea automáticamente por src/db/indexes.js)
sh.shardCollection(
  "restaurant_platform.orders",
  { restaurantId: 1, createdAt: 1 }
)

# Verificar estado de sharding
sh.status()
db.orders.getShardDistribution()
```

**Opción 2: Configuración Programática**

La configuración de fragmentación está definida en [`src/db/sharding.js`](src/db/sharding.js). Ver archivo para documentación detallada y funciones de configuración.

### Monitoreo de Rendimiento

```javascript
// Verificar cómo se distribuyen las órdenes entre fragmentos
db.orders.getShardDistribution()

// Verificar que la consulta usa clave de fragmentación (buscar "SINGLE_SHARD" en explain)
db.orders.find({ 
  restaurantId: ObjectId("..."), 
  createdAt: { $gte: new Date("2026-03-01") } 
}).explain("executionStats")

// Ver rangos de chunks
use config
db.chunks.find({ ns: "restaurant_platform.orders" }).pretty()
```

### Distribución de Chunks

- MongoDB automáticamente divide la colección `orders` en **chunks** (64MB por defecto)
- Cada chunk cubre un rango: `{ restaurantId: A, createdAt: fecha1 }` → `{ restaurantId: B, createdAt: fecha2 }`
- El **balanceador** automáticamente migra chunks entre fragmentos para distribución uniforme

### Notas para Desarrollo

- **Pruebas Locales:** Sharding requiere un replica set. Para desarrollo de nodo único, el índice de clave de fragmentación aún mejora el rendimiento de consultas
- **Atlas M0:** Los clusters de nivel gratuito no soportan sharding, pero el índice compuesto proporciona la misma optimización de consultas
- **Producción:** Habilitar sharding **antes** de alcanzar millones de documentos para evitar sobrecarga de migración

---

## Documentación de la API

### URL Base
`http://localhost:3000/api`

### Autenticación
*(No implementada — este es un proyecto de base de datos, no un proyecto de seguridad)*

---

### Usuarios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/users` | Crear usuario (dirección embebida) |
| `GET` | `/users` | Listar usuarios (filtrar, ordenar, skip, limit, proyección) |
| `GET` | `/users/:id` | Obtener usuario por ID |
| `GET` | `/users/nearby?longitude=-90.5&latitude=14.6` | Encontrar usuarios cerca de coordenadas (geoespacial) |
| `PUT` | `/users/:id` | Actualizar usuario |
| `PATCH` | `/users/:id/role` | Actualizar rol de usuario |
| `DELETE` | `/users/:id` | Eliminar usuario |
| `DELETE` | `/users/bulk` | Eliminar muchos usuarios (body: `{ active: false }`) |

**Ejemplo de Petición:**
```bash
POST /api/users
Content-Type: application/json

{
  "name": "Juan",
  "lastName": "Pérez",
  "email": "juan@example.com",
  "passwordHash": "hashed_password",
  "role": "cliente",
  "phone": "+502 1234-5678",
  "address": {
    "street": "5ta Avenida 10-20",
    "city": "Guatemala",
    "state": "Guatemala",
    "zipCode": "01010",
    "location": {
      "type": "Point",
      "coordinates": [-90.5069, 14.6349]
    }
  }
}
```

---

### Restaurantes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/restaurants` | Crear restaurante |
| `GET` | `/restaurants` | Listar restaurantes (filtrar por ciudad, etiquetas, activo) |
| `GET` | `/restaurants/:id` | Obtener restaurante por ID |
| `GET` | `/restaurants/nearby?longitude=-90.5&latitude=14.6` | Encontrar restaurantes cerca de coordenadas |
| `PUT` | `/restaurants/:id` | Actualizar restaurante |
| `PATCH` | `/restaurants/:id/tags` | Agregar etiqueta (body: `{ tag: "Italiana" }`) — **$addToSet** |
| `PATCH` | `/restaurants/:id/tags/remove` | Remover etiqueta (body: `{ tag: "Italiana" }`) — **$pull** |
| `DELETE` | `/restaurants/:id` | Eliminar restaurante |
| `DELETE` | `/restaurants/bulk/inactive` | Eliminar todos los restaurantes inactivos |

---

### Ítems del Menú

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/menu-items` | Crear ítem del menú (referenciado a restaurante) |
| `POST` | `/menu-items/bulk` | Crear muchos ítems (body: `{ items: [...] }`) |
| `POST` | `/menu-items/bulk-price-adjustment` | **Ajuste masivo de precios (BulkWrite)** — operaciones mixtas |
| `GET` | `/menu-items` | Listar ítems (filtrar por restaurante, categoría, disponible) |
| `GET` | `/menu-items/search?q=pizza` | Búsqueda de texto (usa índice de texto) |
| `GET` | `/menu-items/:id` | Obtener ítem por ID |
| `PUT` | `/menu-items/:id` | Actualizar ítem |
| `PATCH` | `/menu-items/restaurant/:restaurantId/price` | Actualizar precios de todos los ítems (body: `{ percentageChange: 10 }`) |
| `DELETE` | `/menu-items/:id` | Eliminar ítem |
| `DELETE` | `/menu-items/restaurant/:restaurantId` | Eliminar todos los ítems de un restaurante |

**Ejemplo de Ajuste Masivo de Precios (Crédito Extra - BulkWrite):**
```bash
POST /api/menu-items/bulk-price-adjustment
Content-Type: application/json

{
  "restaurantId": "507f1f77bcf86cd799439011",
  "categoryAdjustments": [
    { "category": "bebidas", "multiplier": 1.08 },
    { "category": "postres", "multiplier": 1.05 }
  ],
  "specialItemUpdate": {
    "name": "Plato del día",
    "newPrice": 12.99
  },
  "discontinuedCutoffDays": 30
}
```

**Respuesta:**
```json
{
  "message": "Bulk price adjustment completed successfully",
  "matchedCount": 45,
  "modifiedCount": 43,
  "deletedCount": 2,
  "upsertedCount": 0,
  "operationsExecuted": 4
}
```

**Cómo funciona:**
- Usa `db.collection('menu_items').bulkWrite([...])` con **tipos de operación mixtos**
- Operaciones `updateMany` aplican multiplicadores de precio a categorías (ej., 8% de aumento en bebidas)
- Operación `updateOne` establece un precio específico en un ítem nombrado (especial del día)
- Operación `deleteMany` remueve ítems no disponibles más antiguos que la fecha de corte
- Todas las operaciones se ejecutan en un **único viaje redondo** a la base de datos para rendimiento óptimo

---

### Órdenes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/orders` | **Crear orden (Transacción 1)** — valida ítems, actualiza métricas |
| `POST` | `/orders/bulk-nightly-close` | **Reconciliación nocturna (BulkWrite)** — auto-completa/cancela órdenes atascadas |
| `GET` | `/orders` | Listar órdenes (filtrar por usuario, restaurante, estado) |
| `GET` | `/orders/:id` | Obtener orden con $lookup (datos de usuario y restaurante) |
| `PATCH` | `/orders/:id/status` | Actualizar estado de orden (body: `{ status: "entregado" }`) |
| `PATCH` | `/orders/:id/items` | Agregar ítem a orden — **$push** |
| `PATCH` | `/orders/:id/items/remove` | Remover ítem de orden — **$pull** |
| `PATCH` | `/orders/:id/cancel` | **Cancelar orden (Transacción 3)** — revierte métricas |
| `PUT` | `/orders/bulk/status` | Actualizar estado de muchas órdenes |
| `DELETE` | `/orders/:id` | Eliminar orden |
| `DELETE` | `/orders/bulk/cancelled` | Eliminar todas las órdenes canceladas |

**Ejemplo de Crear Orden:**
```bash
POST /api/orders
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "restaurantId": "507f1f77bcf86cd799439012",
  "items": [
    {
      "menuItemId": "507f1f77bcf86cd799439013",
      "quantity": 2
    },
    {
      "menuItemId": "507f1f77bcf86cd799439014",
      "quantity": 1
    }
  ],
  "paymentMethod": "tarjeta"
}
```

**Ejemplo de Cierre Nocturno (Crédito Extra - BulkWrite):**
```bash
POST /api/orders/bulk-nightly-close
# No se requiere cuerpo de petición - usa timestamps del servidor
```

**Respuesta:**
```json
{
  "message": "Nightly close completed",
  "delivered": 12,
  "cancelled": 5,
  "totalModified": 17,
  "executedAt": "2026-03-09T23:59:59.123Z"
}
```

**Cómo funciona:**
- Usa `db.collection('orders').bulkWrite([...])` con **dos operaciones updateMany**
- Auto-completa órdenes atascadas en "preparando" por 2+ horas → cambia a "entregado"
- Auto-cancela órdenes atascadas en "pendiente" por 24+ horas → cambia a "cancelado"
- Simula un **trabajo batch automatizado** que se ejecuta al final del día vía cron
- Previene que las órdenes queden atascadas en estados intermedios indefinidamente
- Todas las operaciones se ejecutan en una **única llamada bulkWrite atómica**

---

### Reseñas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/reviews` | **Crear reseña (Transacción 2)** — actualiza calificación del restaurante |
| `GET` | `/reviews` | Listar reseñas (filtrar por restaurante, usuario, calificación) |
| `GET` | `/reviews/:id` | Obtener reseña con $lookup (usuario y restaurante) |
| `PUT` | `/reviews/:id` | **Editar reseña (Transacción 4)** — recalcula calificación |
| `DELETE` | `/reviews/:id` | Eliminar reseña |
| `DELETE` | `/reviews/restaurant/:restaurantId` | Eliminar todas las reseñas de un restaurante |

---

### Archivos (GridFS)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/files/upload` | Subir imagen (multipart/form-data, campo: `file`) |
| `GET` | `/files` | Listar todos los archivos |
| `GET` | `/files/:fileId` | Descargar archivo (transmite directamente) |
| `DELETE` | `/files/:fileId` | Eliminar archivo de GridFS |

**Ejemplo de Subida (curl):**
```bash
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@restaurant.jpg"
```

**Respuesta:**
```json
{
  "message": "File uploaded successfully",
  "fileId": "507f1f77bcf86cd799439011",
  "filename": "restaurant.jpg"
}
```

---

### Analíticas

#### Agregaciones Complejas

| Endpoint | Descripción | Técnicas Usadas |
|----------|-------------|-----------------|
| `GET /analytics/restaurants/top-rated` | Restaurantes mejor calificados (mín 5 reseñas) | $match, $sort, $limit |
| `GET /analytics/menu-items/top-sold` | Ítems más ordenados | $unwind, $group, $lookup |
| `GET /analytics/users/avg-spend` | Gasto promedio por usuario | $group, $lookup, $divide |
| `GET /analytics/restaurants/monthly-revenue` | Ingresos por mes | $group, ops de fecha, $lookup |
| `GET /analytics/reviews/rating-distribution` | Conteos de calificación por restaurante | Doble $group, $lookup |

#### Agregaciones Simples

| Endpoint | Descripción | Método |
|----------|-------------|--------|
| `GET /analytics/orders/count` | Conteo total de órdenes | `countDocuments()` |
| `GET /analytics/orders/count-by-status?status=entregado` | Contar por estado | `countDocuments({ status })` |
| `GET /analytics/restaurants/distinct-cities` | Ciudades únicas | `distinct('address.city')` |
| `GET /analytics/menu-items/distinct-categories` | Categorías únicas | `distinct('category')` |
| `GET /analytics/users/count-by-role?role=cliente` | Contar por rol | `countDocuments({ role })` |

---

## Esquema de la Base de Datos

### Resumen de Colecciones

```
restaurant_platform/
├── users (500 docs)
├── restaurants (100 docs)
├── menu_items (~2,000 docs)
├── orders (55,000+ docs) ← Volumen principal de datos
├── reviews (2,000 docs)
└── uploads.files / uploads.chunks (GridFS)
```

### Características Clave del Esquema

**Documentos Embebidos:**
- `users.address` — calle, ciudad, estado, ubicación (GeoJSON)
- `restaurants.address` — misma estructura
- `restaurants.schedule` — Horarios de apertura/cierre
- `orders.items[]` — Instantánea de ítems del menú al momento de la orden

**Documentos Referenciados:**
- `orders.userId` → `users._id`
- `orders.restaurantId` → `restaurants._id`
- `menu_items.restaurantId` → `restaurants._id`
- `reviews.userId` → `users._id`
- `reviews.restaurantId` → `restaurants._id`

**Nuevos Campos (corregidos del diseño):**
- `users.orderCount` — Requerido por Transacción 1
- `restaurants.totalOrders` — Requerido por Transacciones 1 & 3
- `restaurants.totalRevenue` — Requerido por Transacción 3

Definiciones completas del esquema en documento de especificación de construcción.

---

## Cobertura de Rúbrica

| Requisito | Puntos | Implementación |
|-----------|--------|----------------|
| **Documentación de Diseño** | 10 | Documento de diseño original (enviado por separado) |
| **Modelado de Datos** | 5 | Esquemas corregidos en código + comentarios |
| **Índices (4 tipos)** | 5 | `src/db/indexes.js` — simple, compuesto, geo, texto, multikey, clave de fragmentación |
| **CRUD - Create (embebido)** | 10 | POST `/users`, POST `/orders` (ítems embebidos) |
| **CRUD - Create (referenciado)** | 10 | POST `/menu-items`, POST `/reviews` |
| **Read (complejo)** | 15 | Todos los endpoints GET + $lookup + filtros + ordenar + proyección |
| **Update One** | 10 | Endpoints PUT en todas las colecciones |
| **Update Many** | 10 | PATCH `/menu-items/restaurant/:id/price` |
| **Delete One** | 10 | DELETE `/:id` en todas las colecciones |
| **Delete Many** | 10 | Endpoints DELETE `/bulk/*` |
| **GridFS + 50k docs** | 5 | `/files/upload` + seed crea 55,000 órdenes |
| **Agregaciones Simples** | 5 | `countDocuments()`, `distinct()` — 5 endpoints |
| **Agregaciones Complejas** | 10 | 5 pipelines con $lookup, $unwind, $group, ops de fecha |
| **Operaciones de Arrays** | 10 | $push/$pull en `orders.items`, $addToSet/$pull en `restaurants.tags` |
| **Docs Embebidos** | 5 | `users.address`, `restaurants.schedule`, `orders.items` |
| **Transacciones** | — | 4 transacciones (crear/cancelar orden, crear/editar reseña) |
| **Geoespacial** | — | Índice 2dsphere + consultas $near en endpoints `/nearby` |
| **Búsqueda de Texto** | — | Índice de texto + $text en `/menu-items/search` |
| **Sharding** | — | Clave de fragmentación compuesta `{ restaurantId: 1, createdAt: 1 }` en orders |
| **TOTAL** | **100** | Todos los requisitos cumplidos |
| **BulkWrite (Crédito Extra)** | **+5** | 2 implementaciones: ajuste de precios de menú + reconciliación nocturna de órdenes |

---

## Estructura del Proyecto

```
restaurant_platform/
├── .env                      # Variables de entorno
├── .gitignore
├── package.json
├── README.md                 # Este archivo
│
├── src/
│   ├── index.js              # Punto de entrada — servidor Express
│   │
│   ├── db/
│   │   ├── connection.js     # Singleton de cliente MongoDB
│   │   ├── indexes.js        # Todos los 6 tipos de índice (incluye clave de fragmentación)
│   │   └── sharding.js       # Configuración y setup de sharding
│   │
│   ├── config/
│   │   └── gridfs.js         # Inicialización de bucket GridFS
│   │
│   ├── routes/
│   │   ├── users.routes.js
│   │   ├── restaurants.routes.js
│   │   ├── menuItems.routes.js
│   │   ├── orders.routes.js
│   │   ├── reviews.routes.js
│   │   ├── files.routes.js
│   │   └── analytics.routes.js
│   │
│   ├── controllers/
│   │   ├── users.controller.js
│   │   ├── restaurants.controller.js
│   │   ├── menuItems.controller.js    # Incluye bulkPriceAdjustment (bulkWrite)
│   │   ├── orders.controller.js
│   │   ├── reviews.controller.js
│   │   ├── files.controller.js
│   │   └── analytics.controller.js
│   │
│   ├── services/
│   │   └── transactions.service.js  # Todas las 4 transacciones multi-documento
│   │
│   └── seed/
│       └── seed.js           # Genera 55,000 órdenes
│
└── test/
    ├── explain_demo.js       # Demo de rendimiento de índices
    ├── sharding_guide.js     # Guía de configuración de sharding
    └── bulkwrite_demo.js     # Demostración de BulkWrite (Crédito Extra)
```

---

## Pruebas y Validación

### 1. Verificar Índices
```bash
npm run explain
```
Muestra rendimiento antes/después para cada tipo de índice.

### 2. Probar Transacciones
```bash
# Crear orden (Transacción 1)
POST /api/orders

# Cancelar orden (Transacción 3)
PATCH /api/orders/:id/cancel

# Crear reseña (Transacción 2)
POST /api/reviews

# Editar reseña (Transacción 4)
PUT /api/reviews/:id
```

### 3. Probar Operaciones de Arrays
```bash
# Agregar etiqueta a restaurante
PATCH /api/restaurants/:id/tags
{ "tag": "Nueva Etiqueta" }

# Remover etiqueta
PATCH /api/restaurants/:id/tags/remove
{ "tag": "Nueva Etiqueta" }

# Agregar ítem a orden
PATCH /api/orders/:id/items
{ "menuItemId": "...", "quantity": 1 }

# Remover ítem de orden
PATCH /api/orders/:id/items/remove
{ "menuItemId": "..." }
```

### 4. Probar GridFS
```bash
# Subir
curl -X POST http://localhost:3000/api/files/upload -F "file=@image.jpg"

# Descargar
curl http://localhost:3000/api/files/[fileId] --output downloaded.jpg
```

### 5. Probar BulkWrite (Crédito Extra)

**Opción A: Ajuste Masivo de Precios de Ítems del Menú**
```bash
POST /api/menu-items/bulk-price-adjustment
{
  "restaurantId": "507f1f77bcf86cd799439011",
  "categoryAdjustments": [
    { "category": "bebidas", "multiplier": 1.08 }
  ],
  "specialItemUpdate": {
    "name": "Plato del día",
    "newPrice": 12.99
  },
  "discontinuedCutoffDays": 30
}
```

Esto demuestra `bulkWrite` con:
- `updateMany` para ajustes de precio por categoría
- `updateOne` para precio de ítem especial
- `deleteMany` para limpiar ítems descontinuados antiguos

**Opción B: Reconciliación de Cierre Nocturno de Órdenes**
```bash
POST /api/orders/bulk-nightly-close
# No se requiere cuerpo - usa timestamps del servidor
```

Esto demuestra `bulkWrite` con:
- `updateMany` para auto-completar órdenes atascadas en "preparando" (2+ horas)
- `updateMany` para auto-cancelar órdenes atascadas en "pendiente" (24+ horas)
- Simula reconciliación batch automatizada de fin de día

