const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Endpoint Público: Listado de Laptops Disponibles para Clientes
 * Seguridad: Solo devuelve campos estrictamente comerciales y públicos.
 * NUNCA devuelve precio_minimo, costos, responsables, comisiones ni datos internos.
 */
router.get('/catalog', async (req, res) => {
  try {
    const { marca, condicion, search } = req.query;

    let query = `
      SELECT 
        l.id,
        l.marca,
        l.modelo,
        l.condicion,
        l.procesador,
        l.ram,
        l.almacenamiento,
        l.pantalla,
        l.precio_sugerido,
        l.estado,
        l.foto_portada,
        l.created_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', li.id,
                'url', li.url,
                'es_portada', li.es_portada,
                'orden', li.orden
              ) ORDER BY li.es_portada DESC, li.orden ASC, li.id ASC
            )
            FROM laptop_imagenes li
            WHERE li.laptop_id = l.id
          ),
          '[]'::json
        ) AS imagenes
      FROM laptops l
      WHERE l.estado IN ('disponible', 'reservada')
        AND COALESCE(l.publicado, TRUE) = TRUE
    `;

    const params = [];

    if (marca && marca.trim()) {
      params.push(marca.trim());
      query += ` AND LOWER(l.marca) = LOWER($${params.length})`;
    }

    if (condicion && (condicion === 'nueva' || condicion === 'seminueva')) {
      params.push(condicion);
      query += ` AND l.condicion = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(l.marca) LIKE $${params.length} OR
        LOWER(l.modelo) LIKE $${params.length} OR
        LOWER(COALESCE(l.procesador, '')) LIKE $${params.length} OR
        LOWER(COALESCE(l.ram, '')) LIKE $${params.length} OR
        LOWER(COALESCE(l.almacenamiento, '')) LIKE $${params.length}
      )`;
    }

    query += ` ORDER BY l.id DESC;`;

    const result = await db.query(query, params);

    // Sanitización preventiva adicional por software
    const sanitizedLaptops = result.rows.map(row => ({
      id: row.id,
      marca: row.marca,
      modelo: row.modelo,
      condicion: row.condicion,
      procesador: row.procesador,
      ram: row.ram,
      almacenamiento: row.almacenamiento,
      pantalla: row.pantalla,
      precio_sugerido: parseFloat(row.precio_sugerido || 0),
      estado: row.estado,
      foto_portada: row.foto_portada,
      imagenes: Array.isArray(row.imagenes) ? row.imagenes : [],
      created_at: row.created_at
    }));

    res.json({
      success: true,
      total: sanitizedLaptops.length,
      laptops: sanitizedLaptops
    });
  } catch (err) {
    console.error('Error al consultar catálogo público:', err);
    res.status(500).json({ error: 'Error al consultar catálogo de laptops.' });
  }
});

/**
 * Endpoint Público: Detalle individual de una laptop para visualización o compartir
 */
router.get('/catalog/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        l.id,
        l.marca,
        l.modelo,
        l.condicion,
        l.procesador,
        l.ram,
        l.almacenamiento,
        l.pantalla,
        l.precio_sugerido,
        l.estado,
        l.foto_portada,
        l.created_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', li.id,
                'url', li.url,
                'es_portada', li.es_portada,
                'orden', li.orden
              ) ORDER BY li.es_portada DESC, li.orden ASC, li.id ASC
            )
            FROM laptop_imagenes li
            WHERE li.laptop_id = l.id
          ),
          '[]'::json
        ) AS imagenes
      FROM laptops l
      WHERE l.id = $1
        AND l.estado IN ('disponible', 'reservada')
        AND COALESCE(l.publicado, TRUE) = TRUE
      LIMIT 1;
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no disponible en el catálogo público.' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      laptop: {
        id: row.id,
        marca: row.marca,
        modelo: row.modelo,
        condicion: row.condicion,
        procesador: row.procesador,
        ram: row.ram,
        almacenamiento: row.almacenamiento,
        pantalla: row.pantalla,
        precio_sugerido: parseFloat(row.precio_sugerido || 0),
        estado: row.estado,
        foto_portada: row.foto_portada,
        imagenes: Array.isArray(row.imagenes) ? row.imagenes : [],
        created_at: row.created_at
      }
    });
  } catch (err) {
    console.error('Error obteniendo detalle de laptop pública:', err);
    res.status(500).json({ error: 'Error al consultar equipo.' });
  }
});

module.exports = router;
