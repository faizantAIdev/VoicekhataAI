const express = require('express');

const {
  getSuppliers,
  createSupplier,
  getSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierLedger
} = require('../controllers/supplierController');

const router = express.Router();

// GET ALL SUPPLIERS
router.get('/', getSuppliers);
router.get('/:id/transactions', getSupplierLedger);

// CREATE SUPPLIER
router.post('/', createSupplier);

// GET SINGLE SUPPLIER
router.get('/:id', getSupplier);

// UPDATE SUPPLIER
router.put('/:id', updateSupplier);

// DELETE SUPPLIER
router.delete('/:id', deleteSupplier);


module.exports = router;