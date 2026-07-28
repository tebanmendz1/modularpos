# Migración de FacturaPOS a PostgreSQL en EasyPanel

## 1. Exportar los datos actuales antes del deploy

Mientras la versión anterior todavía está funcionando, descargue:

```text
https://SU-DOMINIO/api/db
```

Guarde la respuesta como `facturapos-backup.json` y verifique que contenga las empresas, ventas y clientes actuales. No continúe sin este archivo.

## 2. Crear PostgreSQL en EasyPanel

Dentro del mismo proyecto:

1. Pulse **+ Service**.
2. Seleccione **Postgres**.
3. Use un nombre como `facturapos-db`.
4. Defina una contraseña larga y única.
5. No publique el puerto 5432 en Internet; use la conexión interna del proyecto.
6. Copie la URL interna mostrada en las credenciales del servicio.

Los datos del servicio PostgreSQL se conservan en el almacenamiento administrado por EasyPanel, separado del contenedor de la aplicación.

## 3. Variables de la aplicación

En **App Service → Environment** configure:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://USUARIO:CONTRASENA@SERVICIO_POSTGRES:5432/BASE_DE_DATOS
DATABASE_SSL=false
DATABASE_POOL_MAX=10
ECF_MASTER_KEY=UN_SECRETO_LARGO_Y_PERMANENTE
MIGRATION_TOKEN=UN_TOKEN_ALEATORIO_DE_UN_SOLO_USO
```

`ECF_MASTER_KEY` debe conservar siempre el mismo valor. Cambiarlo impediría descifrar las credenciales e-CF guardadas.

Configure el proxy de EasyPanel hacia el puerto `3000` y mantenga una sola réplica de la aplicación durante esta fase de persistencia JSONB.

## 4. Primer deploy

Despliegue la aplicación. En los logs debe aparecer uno de estos mensajes:

```text
PostgreSQL initialized with the initial application seed.
Database state loaded from PostgreSQL.
```

Compruebe:

```text
https://SU-DOMINIO/api/health
```

La respuesta debe indicar `database: postgresql` y `persistence: durable`.

## 5. Importar las empresas actuales

Desde una terminal que tenga el archivo exportado:

```bash
curl -X POST "https://SU-DOMINIO/api/admin/import-legacy" \
  -H "Authorization: Bearer SU_MIGRATION_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "@facturapos-backup.json"
```

La respuesta informará cuántas empresas, ventas y clientes fueron importados. Inicie sesión y valide esos registros antes de continuar.

## 6. Cerrar la ventana de migración

Después de confirmar los datos:

1. Elimine `MIGRATION_TOKEN` de las variables de EasyPanel.
2. Vuelva a desplegar.
3. Confirme nuevamente `/api/health` y el acceso a las empresas.

## 7. Backups

Active los backups de PostgreSQL de EasyPanel hacia un bucket S3 compatible. Se recomienda:

- backup diario;
- retención mínima de 30 días;
- backup adicional antes de cada actualización importante;
- prueba periódica de restauración.

No use `db_store.json`, el repositorio Git ni el sistema de archivos del contenedor como respaldo de producción.
