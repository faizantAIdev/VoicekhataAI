
const express = require('express');
const cors = require('cors');
const supplierRoutes = require('./routes/supplierRoutes');
const customerRoutes = require('./routes/customerRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const employeeRoutes = require('./routes/employeeRoutes');

const app = express();

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const time = Date.now() - start;

    console.log(
      `⏱️ ${req.method} ${req.originalUrl} → ${res.statusCode} → ${time}ms`
    );
  });

  next();
});
// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());

app.use(express.json());


// ==========================================
// HOME / TEST ROUTE
// ==========================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Voice Khata API is running',
  });
});


// ==========================================
// CUSTOMER ROUTES
// ==========================================

app.use('/api/customers', customerRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/employees', employeeRoutes);
// ==========================================
// 404 ROUTE
// ==========================================
app.use('/api/auth', (req, res, next) => {
  console.log('AUTH ROUTE HIT:', req.method, req.originalUrl);
  next();
}, authRoutes);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});


// ==========================================
// EXPORT APP
// ==========================================

module.exports = app;