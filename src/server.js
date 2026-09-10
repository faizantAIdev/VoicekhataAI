require('dotenv').config();

const app = require('./app');


// ==========================================
// PORT
// ==========================================

const PORT = process.env.PORT || 5000;


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log('');
  console.log('==========================================');
  console.log('🚀 Voice Khata Backend Started');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`👥 Customers: http://localhost:${PORT}/api/customers`);
  console.log(`👥 supplier: http://localhost:${PORT}/api/supplier`);
    console.log(`👥 transaction: http://localhost:${PORT}/api/transactions`);
        console.log(`👥 transaction: http://localhost:${PORT}/api/auth`);


  console.log('==========================================');
  console.log('');
});
