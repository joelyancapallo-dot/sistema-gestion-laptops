require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./initDb');

const authRoutes = require('./routes/authRoutes');
const laptopRoutes = require('./routes/laptopRoutes');
const salesRoutes = require('./routes/salesRoutes');
const commissionRoutes = require('./routes/commissionRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/laptops', laptopRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    sistema: 'Sistema de Gestión Comercial de Laptops',
    moneda: 'PEN (Soles S/)',
    timestamp: new Date().toISOString()
  });
});

// Servir archivos estáticos subidos (Fotografías de laptops)
const fs = require('fs');
const uploadsPath = path.join(__dirname, 'uploads');
const laptopUploadsPath = path.join(uploadsPath, 'laptops');
if (!fs.existsSync(laptopUploadsPath)) {
  fs.mkdirSync(laptopUploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Servir frontend compilado en producción
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Fallback para SPA en cualquier ruta no API
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint no encontrado' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Sistema Comercial de Laptops</title><meta charset="utf-8"></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>API del Sistema Comercial de Laptops Operativa</h2>
          <p>Base de datos PostgreSQL en Docker conectada.</p>
          <p>Compilando frontend...</p>
        </body>
        </html>
      `);
    }
  });
});

// Inicialización
async function startServer() {
  try {
    await initDb();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n======================================================`);
      console.log(`🚀 SISTEMA COMERCIAL DE LAPTOPS OPERATIVO`);
      console.log(`📡 URL Local:      http://localhost:${PORT}`);
      console.log(`📡 URL Red:        http://0.0.0.0:${PORT}`);
      console.log(`💾 Base de Datos:  PostgreSQL 16 en Docker (Puerto 5432)`);
      console.log(`🇵🇪 Moneda:        Soles Peruanos (S/)`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('Error fatal al iniciar servidor:', err);
    process.exit(1);
  }
}

startServer();
