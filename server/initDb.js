require('dotenv').config();
const { pool } = require('./db');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

// Asegurar que la base de datos exista antes de conectar el pool principal
async function ensureDatabaseExists() {
  const targetDb = process.env.DB_NAME || 'tienda_laptops';
  const defaultClient = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres' // Base de datos por defecto siempre presente en PostgreSQL
  });

  try {
    await defaultClient.connect();
    const res = await defaultClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDb]
    );
    if (res.rowCount === 0) {
      console.log(`[DB] Base de datos "${targetDb}" no encontrada. Creándola automáticamente...`);
      await defaultClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`[DB] ¡Base de datos "${targetDb}" creada con éxito!`);
    }
  } catch (err) {
    console.error('[DB] Aviso en verificación de base de datos:', err.message);
  } finally {
    try {
      await defaultClient.end();
    } catch (_) {}
  }
}

async function initDb() {
  await ensureDatabaseExists();
  const client = await pool.connect();
  try {
    console.log('[DB] Iniciando creación de esquema PostgreSQL...');
    await client.query('BEGIN');

    // 1. Tabla de Usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL,
        email VARCHAR(120) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'vendedor')),
        telefono VARCHAR(30),
        activo BOOLEAN DEFAULT TRUE,
        meta_mensual_unidades INT DEFAULT 25,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Tabla de Laptops (Inventario y Catálogo)
    await client.query(`
      CREATE TABLE IF NOT EXISTS laptops (
        id SERIAL PRIMARY KEY,
        marca VARCHAR(60) NOT NULL,
        modelo VARCHAR(120) NOT NULL,
        numero_serie VARCHAR(100) UNIQUE NOT NULL,
        condicion VARCHAR(20) NOT NULL CHECK (condicion IN ('nueva', 'seminueva')),
        procesador VARCHAR(80),
        ram VARCHAR(30),
        almacenamiento VARCHAR(50),
        pantalla VARCHAR(30),
        costo_adquisicion NUMERIC(10, 2) NOT NULL,
        gastos_adquisicion NUMERIC(10, 2) DEFAULT 0.00,
        precio_minimo NUMERIC(10, 2) NOT NULL,
        precio_sugerido NUMERIC(10, 2) NOT NULL,
        estado VARCHAR(20) DEFAULT 'disponible' CHECK (estado IN ('disponible', 'vendida', 'reservada')),
        responsable_id INT REFERENCES usuarios(id),
        fecha_asignacion_responsable TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        foto_portada VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2.1. Asegurar columna foto_portada y tabla de fotografías
    await client.query(`
      ALTER TABLE laptops ADD COLUMN IF NOT EXISTS foto_portada VARCHAR(500);
      ALTER TABLE laptops ADD COLUMN IF NOT EXISTS publicado BOOLEAN DEFAULT TRUE;
      ALTER TABLE laptops ADD COLUMN IF NOT EXISTS descripcion_publica TEXT;
      
      CREATE TABLE IF NOT EXISTS laptop_imagenes (
        id SERIAL PRIMARY KEY,
        laptop_id INT REFERENCES laptops(id) ON DELETE CASCADE,
        url VARCHAR(500) NOT NULL,
        nombre_archivo VARCHAR(255) NOT NULL,
        es_portada BOOLEAN DEFAULT FALSE,
        orden INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Tabla de Reglas de Comisión Retroactiva
    await client.query(`
      CREATE TABLE IF NOT EXISTS reglas_comision (
        id SERIAL PRIMARY KEY,
        nombre_escala VARCHAR(100) NOT NULL,
        rango_min INT NOT NULL,
        rango_max INT NOT NULL,
        monto_por_unidad NUMERIC(10, 2) NOT NULL,
        es_retroactivo BOOLEAN DEFAULT FALSE,
        orden INT DEFAULT 1,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Tabla de Ventas
    await client.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        id SERIAL PRIMARY KEY,
        codigo_venta VARCHAR(40) UNIQUE NOT NULL,
        fecha_venta DATE NOT NULL DEFAULT CURRENT_DATE,
        vendedor_id INT NOT NULL REFERENCES usuarios(id),
        laptop_id INT NOT NULL REFERENCES laptops(id),
        responsable_laptop_id INT REFERENCES usuarios(id),
        costo_adquisicion_hist NUMERIC(10, 2) NOT NULL,
        gastos_adquisicion_hist NUMERIC(10, 2) NOT NULL,
        precio_minimo_hist NUMERIC(10, 2) NOT NULL,
        precio_venta_final NUMERIC(10, 2) NOT NULL,
        diferencia_vendedor NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        comision_volumen NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        ganancia_base_negocio NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        ganancia_neta_negocio NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        metodo_pago VARCHAR(40) NOT NULL DEFAULT 'efectivo' CHECK (metodo_pago IN ('efectivo', 'yape_plin', 'transferencia', 'tarjeta_credito', 'tarjeta_debito')),
        estado VARCHAR(25) NOT NULL DEFAULT 'pagada' CHECK (estado IN ('pendiente', 'pagada', 'entregada', 'anulada', 'devuelta')),
        es_excepcion_precio BOOLEAN DEFAULT FALSE,
        motivo_excepcion TEXT,
        autorizado_por INT REFERENCES usuarios(id),
        notas TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Tabla de Cierres de Periodo Mensual (Liquidaciones Congeladas)
    await client.query(`
      CREATE TABLE IF NOT EXISTS periodos_cierre (
        id SERIAL PRIMARY KEY,
        mes_anio VARCHAR(7) UNIQUE NOT NULL, -- Ej: '2026-11'
        fecha_cierre TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        total_laptops INT NOT NULL,
        total_ventas NUMERIC(12, 2) NOT NULL,
        total_comisiones NUMERIC(12, 2) NOT NULL,
        total_diferencias NUMERIC(12, 2) NOT NULL,
        ganancia_neta NUMERIC(12, 2) NOT NULL,
        gastos_operativos NUMERIC(12, 2) DEFAULT 0.00,
        reglas_snapshot_json JSONB NOT NULL,
        liquidaciones_vendedores_json JSONB NOT NULL,
        cerrado_por INT REFERENCES usuarios(id),
        estado VARCHAR(20) DEFAULT 'cerrado'
      );
    `);

    // 6. Tabla de Gastos Operativos del Negocio (Control de Rentabilidad Real)
    await client.query(`
      CREATE TABLE IF NOT EXISTS gastos_operativos (
        id SERIAL PRIMARY KEY,
        fecha DATE NOT NULL DEFAULT CURRENT_DATE,
        concepto VARCHAR(150) NOT NULL,
        categoria VARCHAR(60) NOT NULL, -- 'alquiler', 'servicios', 'publicidad', 'mantenimiento', 'otros'
        monto NUMERIC(10, 2) NOT NULL,
        registrado_por INT REFERENCES usuarios(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Tabla de Auditoría
    await client.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id SERIAL PRIMARY KEY,
        usuario_id INT REFERENCES usuarios(id),
        accion VARCHAR(60) NOT NULL,
        entidad VARCHAR(50) NOT NULL,
        entidad_id INT,
        detalles_json JSONB,
        ip VARCHAR(45),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Índices para alto rendimiento
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta);
      CREATE INDEX IF NOT EXISTS idx_ventas_vendedor ON ventas(vendedor_id);
      CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
      CREATE INDEX IF NOT EXISTS idx_laptops_estado ON laptops(estado);
      CREATE INDEX IF NOT EXISTS idx_laptops_serie ON laptops(numero_serie);
    `);

    // Migraciones automáticas: Responsabilidad y custodia física de laptops
    await client.query(`
      ALTER TABLE laptops ADD COLUMN IF NOT EXISTS responsable_id INT REFERENCES usuarios(id);
      ALTER TABLE laptops ADD COLUMN IF NOT EXISTS fecha_asignacion_responsable TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS responsable_laptop_id INT REFERENCES usuarios(id);

      CREATE INDEX IF NOT EXISTS idx_laptops_responsable ON laptops(responsable_id);
      CREATE INDEX IF NOT EXISTS idx_ventas_responsable ON ventas(responsable_laptop_id);

      -- Migraciones para sistema de Reserva temporal (24h)
      ALTER TABLE laptops ADD COLUMN IF NOT EXISTS reservado_por INT REFERENCES usuarios(id);
      ALTER TABLE laptops ADD COLUMN IF NOT EXISTS fecha_reserva TIMESTAMP WITH TIME ZONE;
      ALTER TABLE laptops ADD COLUMN IF NOT EXISTS reserva_expira_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE laptops ADD COLUMN IF NOT EXISTS cliente_reserva VARCHAR(150);

      CREATE INDEX IF NOT EXISTS idx_laptops_reservado_por ON laptops(reservado_por);
      CREATE INDEX IF NOT EXISTS idx_laptops_reserva_expira ON laptops(reserva_expira_at);
    `);

    // Secuencia para números de serie automáticos y correlativos (SN-00001, SN-00002, etc.)
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS laptops_sn_seq;
    `);
    await client.query(`
      DO $$
      DECLARE
        max_val bigint;
        seq_val bigint;
        seq_called boolean;
      BEGIN
        SELECT COALESCE(MAX(SUBSTRING(numero_serie FROM '[0-9]+')::bigint), 0) INTO max_val FROM laptops;
        SELECT last_value, is_called INTO seq_val, seq_called FROM laptops_sn_seq;
        IF max_val > 0 THEN
          IF seq_val < max_val OR NOT seq_called THEN
            PERFORM setval('laptops_sn_seq', max_val, true);
          END IF;
        END IF;
      END $$;
    `);

    // Insertar Reglas de Comisión oficiales (si no existen)
    const { rows: reglasExistentes } = await client.query('SELECT COUNT(*) FROM reglas_comision');
    if (parseInt(reglasExistentes[0].count, 10) === 0) {
      console.log('[DB] Insertando reglas de comisiones retroactivas oficiales...');
      await client.query(`
        INSERT INTO reglas_comision (nombre_escala, rango_min, rango_max, monto_por_unidad, es_retroactivo, orden, activo)
        VALUES 
          ('Escala Base (1 a 20 laptops)', 1, 20, 25.00, FALSE, 1, TRUE),
          ('Escala Alta (21 a más laptops - Retroactiva)', 21, 9999, 50.00, TRUE, 2, TRUE);
      `);
    }

    // Insertar Usuario Administrador inicial (si no existe)
    const { rows: adminExistente } = await client.query("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin'");
    if (parseInt(adminExistente[0].count, 10) === 0) {
      console.log('[DB] Creando usuario Propietario / Administrador inicial...');
      const passAdmin = await bcrypt.hash('admin123', 10);
      await client.query(`
        INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, meta_mensual_unidades)
        VALUES ('Propietario / Administrador', 'admin@tiendalaptops.pe', $1, 'admin', '987654321', 50);
      `, [passAdmin]);
    }

    await client.query('COMMIT');
    console.log('[DB] ¡Inicialización de PostgreSQL completada con éxito!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB Error en inicialización]:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  initDb().then(() => {
    console.log('[DB] Proceso terminado.');
    process.exit(0);
  }).catch((err) => {
    console.error('[DB] Falló la inicialización:', err);
    process.exit(1);
  });
}

module.exports = { initDb };
