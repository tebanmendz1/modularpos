# FacturaPOS Cloud - Sistema POS Modular & Multiempresa

Sistema de Punto de Venta (POS) modular, multiempresa y sincronizado con soporte offline, facturación fiscal (NCF / e-CF), control estricto de turnos de caja, inventarios, restaurante, nómina y gestión financiera integral.

> Para producción se requiere PostgreSQL. Consulte la guía de [migración y despliegue en EasyPanel](docs/easypanel-postgresql.md). `db_store.json` se conserva únicamente como respaldo de desarrollo local.

---

## 🚀 Características Principales

- **Multiempresa y Multisucursal**: Gestión centralizada de empresas, sucursales y almacenes con permisos por roles y usuarios.
- **Control Estricto de Caja**: Apertura con fondo inicial, registro de ingresos/egresos y cierre auditado.
- **Facturación Fiscal (República Dominicana)**: Secuencia y validación automática de comprobantes fiscales NCF (B01, B02, B14, B15) y e-CF (E31, E32, E45, E47).
- **Finanzas y Reportes Avanzados**: Análisis de ventas, márgenes por categoría, costos (COGS) y utilidad en tiempo real.
- **Soporte Offline**: Cola de sincronización local que sincroniza automáticamente ventas y movimientos al reconectarse a Internet.
- **Módulo de Restaurante & Mesas**: Gestión visual de zonas, mesas, comandas e insumos.
- **API REST para Clientes Móviles**: Endpoints preparados para aplicaciones móviles (Flutter / Android / iOS).

---

## 🛠️ Requisitos Previos

- **Node.js** v18 o superior
- **npm** o **bun**
- **Docker** y **Docker Compose** *(opcional para contenedorización)*

---

## 📦 Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TU_USUARIO/TU_REPOSITTORIO.git
   cd TU_REPOSITTORIO
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copia el archivo `.env.example` a `.env` y configura tus credenciales:
   ```bash
   cp .env.example .env
   ```

4. **Iniciarlo en modo desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:3000`.

5. **Compilar y ejecutar en producción:**
   ```bash
   npm run build
   npm start
   ```

---

## 🐳 Ejecución con Docker

### Opción 1: Docker Compose (Recomendado)

Inicia la aplicación en un contenedor aislado con un solo comando:

```bash
docker-compose up -d --build
```

La aplicación estará lista en `http://localhost:3000`.

Para detener el contenedor:
```bash
docker-compose down
```

### Opción 2: Docker CLI

1. **Construir la imagen:**
   ```bash
   docker build -t facturapos-cloud-app .
   ```

2. **Ejecutar el contenedor:**
   ```bash
   docker run -d -p 3000:3000 --name facturapos_container facturapos-cloud-app
   ```

---

## 📤 Pasos para Subir el Proyecto a GitHub

1. **Inicializar Git en la carpeta del proyecto:**
   ```bash
   git init
   ```

2. **Agregar los archivos al área de preparación:**
   ```bash
   git add .
   ```

3. **Realizar el primer commit:**
   ```bash
   git commit -m "feat: inicializar proyecto POS Modular con soporte Docker"
   ```

4. **Conectar con tu repositorio remoto de GitHub:**
   ```bash
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/NOMBRE_REPOSITORIO.git
   ```

5. **Subir los cambios a GitHub:**
   ```bash
   git push -u origin main
   ```

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia MIT.
