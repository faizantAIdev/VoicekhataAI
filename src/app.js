
const express = require('express');
const cors = require('cors');
const supplierRoutes = require('./routes/supplierRoutes');
const customerRoutes = require('./routes/customerRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const app = express();

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