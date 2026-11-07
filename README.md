# LaptopPRO ERP — Sistema de Gestión Comercial, Comisiones & Rentabilidad

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwindcss)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![JWT](https://img.shields.io/badge/Auth-JWT-black?logo=jsonwebtokens)
![License](https://img.shields.io/badge/Licencia-Privada-red)

Sistema web integral de planificación de recursos empresariales (**ERP**) enfocado en la gestión comercial, custodia física de inventario, reglas de comisiones escalonadas retroactivas, sobreprecio y análisis financiero de rentabilidad en tiempo real para negocios de venta de laptops y tecnología.

---

## 🚀 Características Principales

### 1. Catálogo de Laptops & Control de Custodia
- **Correlativo Automático:** Generación atómica del número de serie (`SN-00001`, `SN-00002`, etc.) al registrar equipos.
- **Fotografías del Producto:** Carga múltiple por drag & drop (JPG, PNG, WEBP, máx. 5MB), gestión de foto de portada y almacenamiento permanente en servidor.
- **Galería Modal (Lightbox):** Visualización ampliada para vendedores y administradores con navegación por teclado (`←`, `→`, `Esc`).
- **Custodia Física:** Asignación de equipos a vendedores responsables en stand.
- **Reserva Temporal (24 Horas):** Bloqueo de stock temporal exclusivo para vendedores con expiración automática.
- **Transferencia de Equipos:** Función restringida exclusivamente al perfil Administrador.

### 2. Registro de Ventas & Reglas Comerciales
- **Precio Sugerido Automático:** Cálculo dinámico basado en precio mínimo autorizado (+ S/ 150.00) con gastos predeterminados (S/ 15.00).
- **Validación de Precio Mínimo:** Restricción obligatoria si se vende por debajo del mínimo, solicitando motivo y autorización de excepción.
- **Incentivo por Sobreprecio:** 100% de la ganancia por encima del precio mínimo se asigna como sobreprecio al vendedor.
- **Control de Acceso (RBAC):** Creación de ventas restringida al Administrador; vendedores disponen de consulta en modo solo lectura de sus propias operaciones.

### 3. Motor de Comisiones & Liquidación
- **Escala Base:** S/ 25.00 por unidad vendida (de 1 a 20 laptops).
- **Escala de Alto Volumen:** S/ 50.00 por unidad a partir de 21 laptops con **efecto retroactivo** a todas las ventas del mes.
- **Alertas de Motivación:** Indicador en tiempo real de cuántas laptops faltan para alcanzar la meta retroactiva.
- **Cierre Mensual Seguro:** Congelamiento de métricas contables, liquidaciones y balance financiero con exportación a Excel.

### 4. Rentabilidad & Dashboard Financiero
- Gráficos de evolución de ventas diarias y facturación.
- Distribución de ingresos (Costo de adquisición, comisiones, sobreprecios y ganancia neta).
- Registro y deducción de gastos operativos mensuales (alquiler, luz, internet, publicidad).
- Auditoría completa de eventos y transacciones.

---

## 🛠️ Stack Tecnológico

- **Backend:** Node.js, Express, PostgreSQL (`pg`), Multer, Bcrypt.js, JSON Web Tokens (JWT).
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Canvas Confetti, SheetJS (XLSX).
- **Infraestructura:** Docker Compose (PostgreSQL 16).

---

## 📋 Requisitos Previos

- [Node.js](https://nodejs.org/) v18 o superior.
- [Docker Desktop](https://www.docker.com/) (para levantar PostgreSQL en un contenedor) o una instancia local de PostgreSQL 16.
- [Git](https://git-scm.com/) instalado en tu sistema.

---

## ⚡ Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU-USUARIO/sistema-gestion-laptops.git
cd sistema-gestion-laptops
```

### 2. Configurar Variables de Entorno
Copia el archivo de ejemplo y edita las variables si es necesario:
```bash
cp .env.example .env
```

Contenido por defecto en `.env`:
```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=tienda_laptops
JWT_SECRET=super_secreto_tienda_laptops_2026
```

### 3. Iniciar la Base de Datos con Docker
Si utilizas Docker, levanta el contenedor de PostgreSQL con:
```bash
docker-compose up -d
```

### 4. Instalar Dependencias
Instala las dependencias del servidor y del cliente:
```bash
npm install
npm --prefix client install
```

### 5. Compilar el Frontend (Vite)
```bash
npm run build:client
```

### 6. Inicializar Esquema de Base de Datos
```bash
npm run init-db
```

### 7. Iniciar el Servidor
```bash
npm start
```
El sistema estará accesible en: **http://localhost:5000**

---

## 🔑 Credenciales de Acceso por Defecto

| Rol | Usuario / Correo | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `admin@tiendalaptops.pe` | `admin123` |

*Nota: Una vez dentro del sistema como Administrador, puedes crear o editar vendedores en el módulo **Vendedores**.*

---

## 📁 Estructura del Proyecto

```text
├── client/                     # Frontend SPA en React + Vite
│   ├── src/
│   │   ├── components/         # Modales, Navbar, Sidebar, Galería Lightbox
│   │   ├── views/              # Vistas principales (Catálogo, Ventas, Dashboard, etc.)
│   │   ├── utils/              # Funciones de autenticación JWT, exportación Excel y formateadores
│   │   └── App.jsx             # Enrutador principal y sincronización de estado
│   └── dist/                   # Archivos compilados para producción
├── server/                     # Backend API en Node.js + Express
│   ├── middleware/             # Verificación de tokens JWT y roles RBAC
│   ├── routes/                 # Endpoints REST (auth, laptops, ventas, reportes, comisiones)
│   ├── services/               # Lógica de negocio (cálculo de comisiones, métricas y auditoría)
│   ├── uploads/laptops/        # Almacenamiento local de fotografías de productos
│   ├── db.js                   # Conexión al pool de PostgreSQL
│   ├── initDb.js               # Migración e inicialización del esquema SQL
│   └── server.js               # Entrada principal del servidor Express
├── docker-compose.yml          # Contenedor Docker para PostgreSQL 16
├── .env.example                # Plantilla de variables de entorno
├── .gitignore                  # Exclusión de archivos sensibles y node_modules
└── package.json                # Scripts y dependencias del backend
```

---

## 📄 Licencia

Este software es de uso privado y comercial reservado para la gestión de ventas de laptops y equipos informáticos.
