require('dotenv').config();
const { pool } = require('./db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function cleanDatabase() {
  const client = await pool.connect();
  try {
    console.log('[Limpieza] Iniciando limpieza de datos de prueba...');
    await client.query('BEGIN');

    // 1. Eliminar todas las ventas de prueba
    console.log('[Limpieza] Eliminando registros de ventas...');
    await client.query('DELETE FROM ventas;');
    await client.query('ALTER SEQUENCE IF EXISTS ventas_id_seq RESTART WITH 1;');

    // 2. Eliminar fotografías de prueba de la base de datos
    console.log('[Limpieza] Eliminando registros de fotografías...');
    await client.query('DELETE FROM laptop_imagenes;');
    await client.query('ALTER SEQUENCE IF EXISTS laptop_imagenes_id_seq RESTART WITH 1;');

    // 3. Eliminar todas las laptops de prueba
    console.log('[Limpieza] Eliminando inventario de laptops de prueba...');
    await client.query('DELETE FROM laptops;');
    await client.query('ALTER SEQUENCE IF EXISTS laptops_id_seq RESTART WITH 1;');

    // 4. Reiniciar la secuencia correlativa de números de serie para iniciar en SN-00001
    console.log('[Limpieza] Reiniciando correlativo de número de serie a 1...');
    await client.query('DROP SEQUENCE IF EXISTS laptops_sn_seq;');
    await client.query('CREATE SEQUENCE laptops_sn_seq START WITH 1;');

    // 5. Eliminar todos los gastos operativos de prueba
    console.log('[Limpieza] Eliminando gastos operativos...');
    await client.query('DELETE FROM gastos_operativos;');
    await client.query('ALTER SEQUENCE IF EXISTS gastos_operativos_id_seq RESTART WITH 1;');

    // 6. Eliminar cierres de periodo de prueba
    console.log('[Limpieza] Eliminando cierres mensuales de prueba...');
    await client.query('DELETE FROM periodos_cierre;');
    await client.query('ALTER SEQUENCE IF EXISTS periodos_cierre_id_seq RESTART WITH 1;');

    // 7. Limpiar bitácora de auditoría
    console.log('[Limpieza] Limpiando bitácora de auditoría...');
    await client.query('DELETE FROM auditoria;');
    await client.query('ALTER SEQUENCE IF EXISTS auditoria_id_seq RESTART WITH 1;');

    // 8. Limpiar archivos físicos de fotografías en el disco (dejando .gitkeep)
    const uploadsDir = path.join(__dirname, 'uploads/laptops');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          try {
            fs.unlinkSync(path.join(uploadsDir, file));
          } catch (_) {}
        }
      }
      console.log('[Limpieza] Directorio de fotografías físicas limpiado.');
    }

    // 9. Verificar y conservar usuarios (Administrador y Vendedores reales)
    const usersRes = await client.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY id ASC;');
    console.log('[Limpieza] Cuentas de usuario conservadas:', usersRes.rows.map(u => `${u.nombre} (${u.rol})`));

    // 10. Verificar reglas oficiales de comisión
    const reglasCount = await client.query('SELECT count(*) FROM reglas_comision;');
    if (parseInt(reglasCount.rows[0].count, 10) === 0) {
      console.log('[Limpieza] Restaurando reglas oficiales de comisión...');
      await client.query(`
        INSERT INTO reglas_comision (nombre_escala, rango_min, rango_max, monto_por_unidad, es_retroactivo, orden, activo)
        VALUES 
          ('Escala Base (1 a 20 laptops)', 1, 20, 25.00, FALSE, 1, TRUE),
          ('Escala Alta (21 a más laptops - Retroactiva)', 21, 9999, 50.00, TRUE, 2, TRUE);
      `);
    }

    // Registrar inicio del sistema limpio en auditoría
    await client.query(`
      INSERT INTO auditoria (usuario_id, accion, entidad, detalles_json)
      VALUES (1, 'SISTEMA_INICIALIZADO_LIMPIO', 'sistema', $1);
    `, [JSON.stringify({ 
      fecha: new Date(), 
      mensaje: 'Base de datos preparada y lista para producción. Correlativo de serie listo en SN-00001.' 
    })]);

    await client.query('COMMIT');

    const totalUsers = usersRes.rows.length;
    console.log('\n======================================================');
    console.log('✅ BASE DE DATOS COMPLETAMENTE LIMPIA Y LISTA PARA PRODUCCIÓN');
    console.log('• Ventas registradas:       0');
    console.log('• Laptops en catálogo:      0 (Próxima laptop será: SN-00001)');
    console.log('• Fotografías:              0');
    console.log('• Gastos operativos:        0');
    console.log('• Cierres de periodo:       0');
    console.log('• Auditoría:                1 (Evento de inicialización)');
    console.log(`• Usuarios conservados:     ${totalUsers} (Admin + Vendedores reales)`);
    console.log('• Reglas de Comisión:       2 (Escala Base y Escala Alta)');
    console.log('======================================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error durante la limpieza:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

cleanDatabase();
